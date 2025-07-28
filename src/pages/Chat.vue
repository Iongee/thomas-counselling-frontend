<script>
import { useAuthStore } from '../authentication/auth';
import { useRouter } from 'vue-router';
import { checkUser, getMessages, getSessionTurnState, API_BASE_URL } from '../api';
import sseService from '../services/sseService.js';
import ObjectiveSidebar from '../components/ObjectiveSidebar.vue';
import ChatHeader from '../components/ChatHeader.vue';
import MessageList from '../components/MessageList.vue';
import MessageInput from '../components/MessageInput.vue';
import VoteBanner from '../components/VoteBanner.vue';
import EndSessionVoting from '../components/EndSessionVoting.vue';
import SessionSummary from '../components/SessionSummary.vue';

export default {
    components: {
        ObjectiveSidebar,
        ChatHeader,
        MessageList,
        MessageInput,
        VoteBanner,
        EndSessionVoting,
        SessionSummary
    },
    setup() {
        const authStore = useAuthStore();
        const router = useRouter();

        return {
            authStore,
            router,
        };
    },
            async created() {
            this.isCorrectUser = await this.checkMembership();

            if (this.isCorrectUser) {
                // Run these operations in parallel for faster loading
                await Promise.all([
                    this.fetchSessionData(),  // Now includes message counts
                    this.fetchTurnState()
                ]);
                
                // Fetch current objective messages after we have session data
                await this.fetchObjectiveMessages();
                
                // Initialize read-only state based on current objective
                const isCurrentCompleted = this.currentObjectiveIndex < this.sessionCurrentObjectiveIndex ||
                                          (this.completedObjectives === this.totalObjectives && this.currentObjectiveIndex < this.totalObjectives);
                this.isViewingCompletedObjective = isCurrentCompleted;

                // Check if we should load summary data and navigate to it first
                if (this.isInSummaryPhase) {
                    this.currentObjectiveIndex = this.totalObjectives; // Navigate to summary
                    await this.fetchSessionSummary();
                }

                // Connect WebSocket and setup listeners after data is ready
                // Always connect in summary phase (for summary responses and AI summary generation)
                if (!this.isViewingCompletedObjective || this.isInSummaryPhase) {
                    this.connectWebSocket();
                }
                this.setupSSEListeners();
            }
        },
        
        watch: {
            // Watch for when user navigates to summary view
            currentObjectiveIndex(newIndex) {
                if (newIndex === this.totalObjectives && !this.summaryData) {
                    this.fetchSessionSummary();
                }
            }
        },
    
    beforeUnmount() {
        this.removeSSEListeners();

        // Properly cleanup WebSocket connection
        if (this.chatSocket) {
            this.isConnected = false;
            this.chatSocket.onclose = null;
            this.chatSocket.onerror = null;
            this.chatSocket.onmessage = null;
            this.chatSocket.close(1000, 'Component unmounting');
            this.chatSocket = null;
        }
    },
    data() { 
        return {
            isCorrectUser: false,
            isCheckingMembership: true, // Add loading state
            chatSocket: null,
            messages: [],
            sessionPartner: null,
            objectives: [],
            currentObjectiveIndex: 0, // What objective we're currently viewing
            sessionCurrentObjectiveIndex: 0, // What objective the session is actually on
            currentObjective: null,
            sessionData: null,
            turnState: {
                can_send: false,
                status: 'loading',
                waiting_for: [],
            },
            errorMessage: '',
            isConnected: false,
            isLlmTyping: false,
            typingMessage: '',
            completedObjectives: 0,
            totalObjectives: 5,
            messageLimit: 100,
            sseService: null,
            isTransitioning: false,
            switchingObjective: false,
            lastSwitchTime: 0,
            isViewingCompletedObjective: false,
            sessionStatus: 'active',
            moveToNextVotes: {},
            hasVotedToMoveNext: false,
            isCurrentObjectiveReadOnly: false,
            voteActive: false,
            voteInitiatedBy: '',
            voteInitiatedByDisplay: '',
            objectiveMessageCounts: {}, // Add new property to store message counts for all objectives
            
            // Session completion properties
            endSessionVotes: {},
            endSessionVoteActive: false,
            endSessionVoteInitiatedBy: '',
            endSessionVoteInitiatedByDisplay: '',
            isInSummaryPhase: false,
            summaryData: null,
            summaryResponses: [],
            userHasSubmittedSummary: false,
            allSubmittedSummary: false,
            finalSummary: '',
            summaryGenerated: false,

            numMessagesForVotingThreshold: 2,
        }
    },
    computed: {
        canTypeMessage() {
            // Check if viewing a completed objective (read-only mode)
            if (this.isViewingCompletedObjective) {
                return false;
            }

            // Check if all votes are in and transition is pending
            const allVoted = Object.values(this.moveToNextVotes).filter(v => v).length >= 2;
            const transitionPending = allVoted && this.voteActive;

            // Check if session is ending (all voted to end session)
            const allVotedToEnd = this.allVotedToEndSession;

            // Check if AI counselor is thinking or responding
            const isAiTalking = this.turnState.status === 'waiting_for_ai' || this.isLlmTyping;

            // Enhanced transition state checking - disable input during any transition state
            const isInAnyTransitionState = this.isTransitioning || transitionPending || this.switchingObjective;

            // Determines if the input field should be enabled (without checking message content)
            return this.isConnected &&
                   !isInAnyTransitionState &&
                   !allVotedToEnd &&
                   !this.isInSummaryPhase &&
                   this.sessionStatus !== 'completed' &&
                   this.sessionStatus !== 'rejected' &&
                   this.turnState.can_send &&
                   !this.isMessageLimitReached &&
                   !this.isCurrentObjectiveReadOnly &&
                   !isAiTalking &&
                   this.currentObjectiveIndex === this.sessionCurrentObjectiveIndex;
        },

        isMessageLimitReached() {
            return this.totalMessageCount >= this.messageLimit;
        },
        statusMessage() {
            if (this.sessionStatus === 'rejected') {
                return "Session invitation was rejected - chat is read-only";
            }

            if (this.isViewingCompletedObjective) {
                return "Viewing completed objective - read-only mode";
            }

            if (this.allVotedToEndSession || this.isInSummaryPhase) {
                return "Session has ended - chat is now read-only";
            }

            // Check for transition states first (highest priority)
            const allVoted = Object.values(this.moveToNextVotes).filter(v => v).length >= 2;
            const transitionPending = allVoted && this.voteActive;

            if (this.isTransitioning) {
                return "Transitioning to next objective...";
            }

            if (transitionPending) {
                return "All participants voted! Preparing to move to next objective...";
            }

            if (this.switchingObjective) {
                return "Switching objectives...";
            }

            if (this.endSessionVoteActive) {
                if (this.endSessionVoteInitiatedBy === this.authStore.user?.uid) {
                    return "Waiting for other participants to respond to your end session proposal";
                } else if (this.hasVotedToEndSession) {
                    return "Waiting for other participants to respond";
                } else {
                    return `${this.endSessionVoteInitiatedByDisplay} proposed to end the session`;
                }
            }

            // Check if AI is specifically thinking/typing (higher priority than general waiting_for_ai)
            if (this.isLlmTyping) {
                return this.typingMessage || 'AI Counselor is thinking...';
            }

            switch(this.turnState.status) {
                case 'your_turn':
                    return "It's your turn to speak";
                case 'waiting_for_partner':
                    return `Waiting for ${this.turnState.waiting_for.join(', ')} to respond`;
                case 'waiting_for_ai':
                    return 'Waiting for AI Counselor to respond...';
                case 'ready_for_new_round':
                    return 'Ready for new round';
                case 'read_only':
                    return 'Session is read-only - no new messages can be sent';
                default:
                    return '';
            }
        },
        inputPlaceholder() {
            if (!this.canTypeMessage || (this.hasVotedToMoveNext && this.voteActive)) {
                return this.statusMessage;
            }
            return "Type your message here...";
        },
        totalMessageCount() {
            return this.messages.length;  // Count all messages (human + AI)
        },
        canMoveToNextObjective() {
            // Check if AI is currently talking or responding
            const isAiTalking = this.turnState.status === 'waiting_for_ai' || this.isLlmTyping;

            // Check if all participants have voted and transition is pending
            const allVoted = Object.values(this.moveToNextVotes).filter(v => v).length >= 2;
            const transitionPending = allVoted && this.voteActive;

            return this.sessionCurrentObjectiveIndex < this.totalObjectives - 1 &&
                   this.totalMessageCount >= this.numMessagesForVotingThreshold &&
                   !this.isCurrentObjectiveReadOnly &&
                   this.currentObjectiveIndex === this.sessionCurrentObjectiveIndex && // Can only propose from the current session objective
                   !isAiTalking && // Disable when AI is talking
                   !this.isTransitioning && // Disable during transitions
                   !transitionPending; // Disable when all participants have voted
        },
        allVotedToMoveNext() {
            const votes = Object.keys(this.moveToNextVotes);
            return votes.length >= 2 && Object.values(this.moveToNextVotes).every(vote => vote === true);
        },
        // Session completion computed properties
        isOnLastObjective() {
            return this.sessionCurrentObjectiveIndex >= this.totalObjectives - 1;
        },
        canEndSession() {
            return this.isOnLastObjective && 
                   this.totalMessageCount >= this.numMessagesForVotingThreshold && 
                   !this.isCurrentObjectiveReadOnly &&
                   this.currentObjectiveIndex === this.sessionCurrentObjectiveIndex &&
                   !this.isInSummaryPhase;
        },
        allVotedToEndSession() {
            const votes = Object.keys(this.endSessionVotes || {});
            return votes.length >= 2 && Object.values(this.endSessionVotes || {}).every(vote => vote === true);
        },
        isViewingSummary() {
            return this.currentObjectiveIndex === this.totalObjectives; // Summary is at index totalObjectives
        },
        showSummaryInSidebar() {
            return true; // Always show summary section
        },
        summaryState() {
            const state = (() => {
                if (this.summaryGenerated) return 'completed';
                if (this.isInSummaryPhase) return 'active';
                if (this.allVotedToEndSession) return 'active';
                // If all objectives are completed, summary should be accessible
                if (this.completedObjectives === this.totalObjectives) return 'active';
                return 'locked';
            })();

            return state;
        },
        hasVotedToEndSession() {
            const votes = this.endSessionVotes || {};
            // Backend stores votes using Firebase UID (stored in Django username field)
            return this.authStore.user?.uid in votes;
        }
    },
    methods: {
        setupSSEListeners() {
            this.sseService = sseService;

            // Listen for vote updates
            sseService.on('vote_update', (data) => {
                this.handleVoteUpdate(data);
            });

            // Listen for objective transitions
            sseService.on('objective_transition', (data) => {
                this.handleObjectiveTransition(data);
            });

            // Listen for session completion
            sseService.on('session_completion', (data) => {
                this.handleSessionCompletion(data);
            });

            // Listen for end session vote updates
            sseService.on('end_session_vote_update', (data) => {
                this.handleEndSessionVoteUpdate(data);
            });

            // Listen for session summary generated
            sseService.on('session_summary_generated', (data) => {
                this.handleSessionSummaryGenerated(data);
            });

            // Listen for session summary generation starting
            sseService.on('session_summary_generating', (data) => {
                this.handleSessionSummaryGenerating(data);
            });

            // Listen for session summary generation errors
            sseService.on('session_summary_error', (data) => {
                this.handleSessionSummaryError(data);
            });

            // Listen for objective completion
            sseService.on('objective_completion', (data) => {
                this.handleObjectiveCompletion(data);
            });

            // Listen for session invitation rejection
            sseService.on('session_invitation_rejected', (data) => {
                this.handleSessionInvitationRejected(data);
            });
        },
        
        removeSSEListeners() {
            if (this.sseService) {
                this.sseService.off('vote_update', this.handleVoteUpdate);
                this.sseService.off('objective_transition', this.handleObjectiveTransition);
                this.sseService.off('session_completion', this.handleSessionCompletion);
                this.sseService.off('end_session_vote_update', this.handleEndSessionVoteUpdate);
                this.sseService.off('session_summary_generated', this.handleSessionSummaryGenerated);
                this.sseService.off('session_summary_generating', this.handleSessionSummaryGenerating);
                this.sseService.off('session_summary_error', this.handleSessionSummaryError);
                this.sseService.off('objective_completion', this.handleObjectiveCompletion);
            }
        },
        
        handleVoteUpdate(data) {
            const voteData = data.vote_data;
            
            // Only handle updates for the current session and session objective
            if (voteData.session_uuid === this.session_uuid && 
                voteData.objective_index === this.sessionCurrentObjectiveIndex) {
                

                
                // Update vote-related data synchronously for all users
                this.voteActive = voteData.vote_active;
                this.voteInitiatedBy = voteData.vote_initiated_by;
                this.voteInitiatedByDisplay = voteData.vote_initiated_by_display;
                this.moveToNextVotes = voteData.move_to_next_votes || {};
                this.hasVotedToMoveNext = this.authStore.user.uid in this.moveToNextVotes;
                
                // Check if this vote update indicates a transition is about to happen
                const allVoted = Object.values(this.moveToNextVotes).filter(v => v).length >= 2; // Assuming 2 participants
                
                if (allVoted && this.voteActive) {

                    // Don't set transitioning state here - wait for the objective_transition SSE event
                    // This ensures all users transition at exactly the same time
                    this.errorMessage = 'All participants voted! Transitioning to next objective...';
                    
                    // Clear the message after a short delay if no transition happens
                    setTimeout(() => {
                        if (this.errorMessage === 'All participants voted! Transitioning to next objective...') {
                            this.errorMessage = '';
                        }
                    }, 5000);
                }
                

            }
        },
        
        async handleObjectiveTransition(data) {
            const transitionData = data.transition_data;

            // Validate transition data
            if (!transitionData || typeof transitionData.new_objective_index !== 'number' || transitionData.new_objective_index < 0) {
                console.error('Invalid objective transition data:', data);
                return;
            }

            // Set transitioning state for ALL users when SSE event is received
            this.isTransitioning = true;
            this.isCurrentObjectiveReadOnly = true;
            
            try {
                // Update session current objective index
                this.sessionCurrentObjectiveIndex = transitionData.new_objective_index;

                // Update completed objectives count for progress bar
                this.completedObjectives = transitionData.new_objective_index;

                // Switch to the new objective
                this.currentObjectiveIndex = transitionData.new_objective_index;
                this.currentObjective = this.objectives[transitionData.new_objective_index];
                
                // Reset voting states for new objective
                this.moveToNextVotes = {};
                this.hasVotedToMoveNext = false;
                this.voteActive = false;
                this.voteInitiatedBy = '';
                this.voteInitiatedByDisplay = '';
                
                // Show transition message
                this.errorMessage = `Transitioning to Objective ${transitionData.new_objective_index + 1}...`;

                // Clear current messages and fetch new ones immediately
                this.messages = [];

                // Fetch messages for new objective (non-blocking)
                this.fetchObjectiveMessages().catch(error => {
                    console.error('Error fetching objective messages:', error);
                });

                // Clear any transition messages immediately
                this.errorMessage = '';
                
            } catch (error) {
                console.error('Error during objective transition:', error);
                this.errorMessage = 'Error during transition. Please refresh the page.';
            } finally {
                // Reset transitioning state
                this.isTransitioning = false;
                
                // The new objective should not be read-only unless it's completed
                if (this.currentObjectiveIndex === this.sessionCurrentObjectiveIndex) {
                    this.isCurrentObjectiveReadOnly = false;
                }
            }
        },
        
        handleSessionCompletion(data) {
            const completionData = data.completion_data;

            // Only handle completion for the current session
            if (completionData.session_uuid === this.session_uuid) {
                // Update session status
                this.sessionStatus = 'completed';
                this.completedObjectives = completionData.total_objectives;

                // Show completion message (but don't redirect automatically)
                this.showSessionMessage(completionData.message);

                // Note: Don't disable chat input or redirect automatically
                // Users need to stay on the page to complete the summary process
            }
        },
        
        async fetchSessionData() {
            try {
                // Fetch session data including objectives and message counts
                const response = await fetch(`${API_BASE_URL}/api/session/${this.session_uuid}/`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
                    },
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.sessionData = data;
                    this.objectives = data.objectives || [];
                    
                    // Set message counts from the response
                    this.objectiveMessageCounts = data.objective_message_counts || {};
                    
                    // Validate and set objective indices
                    const currentIndex = typeof data.current_objective_index === 'number' ? data.current_objective_index : 0;
                    this.sessionCurrentObjectiveIndex = Math.max(0, Math.min(currentIndex, this.objectives.length - 1));
                    this.currentObjectiveIndex = this.sessionCurrentObjectiveIndex; // Start viewing the current session objective
                    
                    // Ensure we have a valid current objective
                    if (this.objectives.length > 0 && this.currentObjectiveIndex < this.objectives.length) {
                        this.currentObjective = this.objectives[this.currentObjectiveIndex];
                    } else {
                        console.error('No valid objectives found or invalid current objective index');
                        this.errorMessage = 'Session data is invalid. Please refresh the page.';
                        return;
                    }
                    
                    this.totalObjectives = this.objectives.length;
                    // Use backend's completed_objectives if provided, otherwise use sessionCurrentObjectiveIndex
                    // In summary phase: sessionCurrentObjectiveIndex = totalObjectives = completedObjectives
                    this.completedObjectives = data.completed_objectives !== undefined ? data.completed_objectives : this.sessionCurrentObjectiveIndex;

                    // Load end session voting data
                    this.endSessionVotes = data.end_session_votes || {};
                    this.endSessionVoteActive = data.end_session_vote_active || false;
                    this.endSessionVoteInitiatedBy = data.end_session_vote_initiated_by || '';
                    this.endSessionVoteInitiatedByDisplay = data.end_session_vote_initiated_by_display || '';
                    this.isInSummaryPhase = data.is_in_summary_phase || false;
                } else {
                    this.errorMessage = 'Failed to load session data. Please refresh the page.';
                }
            } catch (error) {
                console.error('Error fetching session data:', error);
                this.errorMessage = 'Connection error. Please refresh the page.';
            }
        },
        async fetchObjectiveMessages() {
            // Validate current objective index
            if (typeof this.currentObjectiveIndex !== 'number' || this.currentObjectiveIndex < 0) {
                console.error('Invalid currentObjectiveIndex:', this.currentObjectiveIndex);
                return;
            }
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/objective-messages/${this.session_uuid}/${this.currentObjectiveIndex}/`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
                    },
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.messages = data.messages || [];
                    // Note: We use humanMessageCount computed property instead of currentMessageCount
                    this.moveToNextVotes = data.move_to_next_votes || {};
                    this.hasVotedToMoveNext = data.has_voted_to_move_next || false;
                    this.isCurrentObjectiveReadOnly = data.is_read_only || false;
                    this.voteActive = data.vote_active || false;
                    this.voteInitiatedBy = data.vote_initiated_by || '';
                    this.voteInitiatedByDisplay = data.vote_initiated_by_display || '';
                    // Store message count for this objective
                    this.objectiveMessageCounts[this.currentObjectiveIndex] = data.message_count;

                    // Check if we should show initial greeting typing indicator
                    this.checkForInitialGreetingIndicator();

                    this.scrollToBottom();
                }
            } catch (error) {
                console.error('Error fetching objective messages:', error);
            }
        },
        async fetchTurnState() {
            try {
                const turnState = await getSessionTurnState(this.session_uuid);
                this.turnState = turnState;
            } catch (error) {
                console.error('Error fetching turn state:', error);
            }
        },
        checkForInitialGreetingIndicator() {
            // Show typing indicator if:
            // 1. We're on the first objective (index 0)
            // 2. There are no messages yet
            // 3. Session is active (we can check this via turn state or session status)
            if (this.currentObjectiveIndex === 0 && this.messages.length === 0) {
                this.isLlmTyping = true;
                this.typingMessage = 'AI Counselor is joining the session...';
            }
        },
        scrollToBottom() {
            this.$nextTick(() => {
                if (this.$refs.messageList) {
                    this.$refs.messageList.scrollToBottom();
                }
            });
        },
        async checkMembership() {
            if (this.authStore.isAuthenticated) {
                try {
                    const response = await checkUser(this.session_uuid);
                    this.isCorrectUser = response.session_member;
                    return response.session_member;
                } catch (error) {
                    console.error('Error checking membership:', error);
                    return false;
                } finally {
                    this.isCheckingMembership = false;
                }
            } else {
                this.isCheckingMembership = false;
                return false;
            }
        },
        connectWebSocket() {
            // Prevent connection if already switching objectives
            if (this.switchingObjective) {
                return;
            }

            // Check if already connected
            if (this.chatSocket && this.isConnected) {
                return;
            }

            // Extract host from API_BASE_URL (remove http:// prefix)
            const host = API_BASE_URL.replace('http://', '').replace('https://', '');
            const url = `ws://${host}/ws/socket-server/${this.session_uuid}/`;

            try {
                this.chatSocket = new WebSocket(url);

                this.chatSocket.onopen = () => {
                    this.isConnected = true;
                    this.errorMessage = '';

                    // Validate WebSocket state before sending
                    if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
                        // In summary phase, use the last valid objective index instead of going beyond objectives
                        const objectiveIndex = this.isInSummaryPhase ?
                            Math.max(0, this.totalObjectives - 1) :
                            this.sessionCurrentObjectiveIndex;

                        this.chatSocket.send(JSON.stringify({
                            'type': 'identify',
                            'username': this.authStore.user.uid,
                            'objective_index': objectiveIndex,
                        }));
                    } else {
                        console.error('WebSocket not in OPEN state when trying to send identify message');
                    }
                };
            } catch (error) {
                console.error('Error creating WebSocket connection:', error);
                this.errorMessage = 'Failed to establish connection. Please refresh the page.';
                this.isConnected = false;
            }

            this.chatSocket.addEventListener('close', (event) => {
                this.isConnected = false;

                // Don't show error for intentional closures (like during transitions)
                if (event.code !== 1000 && !this.isTransitioning) {
                    this.errorMessage = 'Connection lost. Attempting to reconnect...';

                    // Attempt to reconnect after a short delay if not transitioning
                    setTimeout(() => {
                        if (!this.isTransitioning && !this.isConnected) {
                            this.connectWebSocket();
                        }
                    }, 2000);
                }
            });

            this.chatSocket.addEventListener('error', (error) => {
                console.error('WebSocket error:', error);
                this.isConnected = false;

                // Only show error message if not transitioning or switching objectives
                if (!this.isTransitioning && !this.switchingObjective) {
                    this.errorMessage = 'Connection error. Please refresh the page.';
                }
            });

            this.chatSocket.addEventListener('message', (e) => {
                const data = JSON.parse(e.data);
                
                switch(data.type) {
                    case 'chat':

                        this.messages.push({
                            content: data.content,
                            sender: data.sender
                        });

                        // Clear initial greeting indicator if this is the first message
                        if (this.currentObjectiveIndex === 0 && this.messages.length === 1) {
                            this.isLlmTyping = false;
                            this.typingMessage = '';
                        }

                        // Update message count for current objective
                        const currentCount = this.objectiveMessageCounts[this.currentObjectiveIndex] || 0;
                        this.objectiveMessageCounts[this.currentObjectiveIndex] = currentCount + 1;
                        this.scrollToBottom();
                        break;
                        
                    case 'turn_state':
                        if (data.user === this.authStore.user.uid) {
                            this.turnState = data.turn_state;
                        }
                        break;
                        
                    case 'objective_completed':
                        this.handleObjectiveCompleted(data);
                        break;
                        
                    case 'message_limit_reached':
                        this.errorMessage = data.message;
                        setTimeout(() => {
                            this.handleMessageLimitReached();
                        }, 3000);
                        break;
                        
                    case 'session_completed':
                        this.errorMessage = data.message;
                        setTimeout(() => {
                            this.$router.push('/dashboard');
                        }, 5000);
                        break;
                        
                    case 'error':
                        this.errorMessage = data.message;
                        if (data.turn_state) {
                            this.turnState = data.turn_state;
                        }
                        setTimeout(() => {
                            this.errorMessage = '';
                        }, 5000);
                        break;
                        
                    case 'llm_typing':
                        if (data.status === 'start') {
                            this.isLlmTyping = true;
                            this.typingMessage = data.message || 'AI Counselor is typing...';
                        } else if (data.status === 'stop') {
                            this.isLlmTyping = false;
                            this.typingMessage = '';
                        }
                        break;
                        
                    case 'session_status':
                        this.showSessionMessage(data.message);
                        break;
                        
                    default:
                        // Unknown message type - no action needed
                }
            });
        },
        handleObjectiveCompleted(data) {
            // Update objective status
            this.completedObjectives++;
            
            // Check if we can advance to next objective
            if (this.sessionCurrentObjectiveIndex < this.objectives.length - 1) {
                // Advance to next objective
                this.sessionCurrentObjectiveIndex++;
                this.currentObjectiveIndex = this.sessionCurrentObjectiveIndex; // Also update viewing objective
                this.currentObjective = this.objectives[this.currentObjectiveIndex];
                
                // Refresh message counts
                this.fetchAllObjectiveMessageCounts();
                
                // Reconnect WebSocket for new objective
                this.chatSocket.close();
                this.messages = [];
                this.connectWebSocket();
            } else {
                // All objectives completed
                this.showSessionMessage("All objectives completed! Session finished.");
            }
        },
        sendMessage(messageText) {
            // Check if we can send message (without checking message content since it's passed as parameter)
            if (!this.canTypeMessage) return;

            // Additional check to prevent sending during vote transitions
            const allVoted = Object.values(this.moveToNextVotes).filter(v => v).length >= 2;
            if (allVoted && this.voteActive) {

                this.errorMessage = 'Cannot send message - transition in progress';
                setTimeout(() => {
                    if (this.errorMessage === 'Cannot send message - transition in progress') {
                        this.errorMessage = '';
                    }
                }, 2000);
                return;
            }

            // Validate WebSocket connection state
            if (!this.chatSocket || this.chatSocket.readyState !== WebSocket.OPEN) {
                console.error('WebSocket not ready for sending message');
                this.errorMessage = 'Connection not ready. Please wait a moment and try again.';
                setTimeout(() => {
                    if (this.errorMessage === 'Connection not ready. Please wait a moment and try again.') {
                        this.errorMessage = '';
                    }
                }, 2000);
                return;
            }

            const messageToSend = messageText.trim();

            try {


                this.chatSocket.send(JSON.stringify({
                    'username': this.authStore.user.uid,
                    'message': messageToSend,
                    'objective_index': this.currentObjectiveIndex,
                }));

                this.errorMessage = '';
            } catch (error) {
                console.error('Error sending message:', error);
                this.errorMessage = 'Failed to send message. Please try again.';
                setTimeout(() => {
                    if (this.errorMessage === 'Failed to send message. Please try again.') {
                        this.errorMessage = '';
                    }
                }, 3000);
            }
        },

        showSessionMessage(message) {
            // Session message received - could be displayed to user if needed
        },
        handleMessageLimitReached() {
            // Refresh the session data and move to the next objective
            this.fetchSessionData().then(() => {
                this.fetchObjectiveMessages();
                this.errorMessage = '';
                
                // Reconnect WebSocket for new objective
                this.chatSocket.close();
                this.connectWebSocket();
            });
        },
        async voteToMoveNext() {
            // Validate current objective index
            if (typeof this.currentObjectiveIndex !== 'number' || this.currentObjectiveIndex < 0) {
                console.error('Invalid currentObjectiveIndex for voting:', this.currentObjectiveIndex);
                this.errorMessage = 'Error: Invalid objective for voting.';
                return;
            }
            
            // Store original state for rollback
            const originalHasVoted = this.hasVotedToMoveNext;
            const originalVoteActive = this.voteActive;
            const originalMoveToNextVotes = { ...this.moveToNextVotes };
            
            // Immediately mark this user as having voted (optimistic update)
            this.hasVotedToMoveNext = true;
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/vote-move-next/${this.session_uuid}/${this.currentObjectiveIndex}/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
                    },
                    body: JSON.stringify({
                        action: 'vote'
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Update voting state immediately
                    this.moveToNextVotes = data.move_to_next_votes || {};
                    this.voteActive = data.vote_active || false;
                    this.voteInitiatedBy = data.vote_initiated_by || '';
                    this.voteInitiatedByDisplay = data.vote_initiated_by_display || '';
                    
                    // Check if backend automatically moved to next objective
                    if (data.moved_to_next) {

                        
                        // Show immediate feedback but don't set transitioning state yet
                        // The SSE event will handle the actual transition
                        this.errorMessage = 'All participants voted! Moving to next objective...';
                        
                        // Auto-clear the message after a short delay
                        setTimeout(() => {
                            if (this.errorMessage === 'All participants voted! Moving to next objective...') {
                                this.errorMessage = '';
                            }
                        }, 3000);
                    } else {
                        // Just a regular vote update - check if we're waiting for others
                        const totalVotes = Object.values(this.moveToNextVotes).filter(v => v).length;
                        const totalParticipants = 2; // Assuming 2 participants for now
                        
                        if (totalVotes < totalParticipants) {
                            this.errorMessage = `Vote recorded! Waiting for ${totalParticipants - totalVotes} more participant(s)...`;
                            setTimeout(() => {
                                if (this.errorMessage.startsWith('Vote recorded!')) {
                                    this.errorMessage = '';
                                }
                            }, 3000);
                        }
                    }
                } else {
                    // Revert optimistic updates on failure
                    this.hasVotedToMoveNext = originalHasVoted;
                    this.voteActive = originalVoteActive;
                    this.moveToNextVotes = originalMoveToNextVotes;
                    this.errorMessage = 'Failed to submit vote. Please try again.';
                }
            } catch (error) {
                console.error('Error voting to move next:', error);
                // Revert optimistic updates on failure
                this.hasVotedToMoveNext = originalHasVoted;
                this.voteActive = originalVoteActive;
                this.moveToNextVotes = originalMoveToNextVotes;
                this.errorMessage = 'Connection error while voting. Please try again.';
            }
        },
        async rejectVote() {
            // Validate current objective index
            if (typeof this.currentObjectiveIndex !== 'number' || this.currentObjectiveIndex < 0) {
                console.error('Invalid currentObjectiveIndex for rejecting vote:', this.currentObjectiveIndex);
                this.errorMessage = 'Error: Invalid objective for rejecting vote.';
                return;
            }
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/vote-move-next/${this.session_uuid}/${this.currentObjectiveIndex}/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
                    },
                    body: JSON.stringify({
                        action: 'reject'
                    })
                });
                
                if (response.ok) {
                    // The SSE event will handle the UI update
                } else {
                    this.errorMessage = 'Failed to reject vote. Please try again.';
                }
            } catch (error) {
                console.error('Error rejecting vote:', error);
                this.errorMessage = 'Connection error while rejecting vote. Please try again.';
            }
        },
        async moveToNextObjective() {
            try {
                const response = await fetch(`${API_BASE_URL}/api/move-to-next-objective/${this.session_uuid}/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
                    },
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.currentObjectiveIndex = data.current_objective_index;
                    this.currentObjective = this.objectives[this.currentObjectiveIndex];
                    this.completedObjectives = this.currentObjectiveIndex;
                    
                    // Reset voting states
                    this.hasVotedToMoveNext = false;
                    this.moveToNextVotes = {};
                    this.voteActive = false;
                    this.voteInitiatedBy = '';
                    this.voteInitiatedByDisplay = '';
                    
                    // Fetch new objective messages
                    await this.fetchObjectiveMessages();
                    
                    // Reconnect WebSocket for new objective
                    this.chatSocket.close();
                    this.connectWebSocket();
                }
            } catch (error) {
                console.error('Error moving to next objective:', error);
            }
        },
        async switchToObjective(index) {
            // Validate index parameter
            if (typeof index !== 'number' || index < 0 || index >= this.objectives.length) {
                console.error('Invalid objective index:', index);
                return;
            }

            if (index === this.currentObjectiveIndex || this.isTransitioning) {
                return;
            }

            // Prevent switching while AI is talking
            const isAiTalking = this.turnState.status === 'waiting_for_ai' || this.isLlmTyping;
            if (isAiTalking) {
                this.errorMessage = 'Please wait for AI Counselor to finish responding before switching objectives';
                setTimeout(() => {
                    if (this.errorMessage === 'Please wait for AI Counselor to finish responding before switching objectives') {
                        this.errorMessage = '';
                    }
                }, 3000);
                return;
            }

            // Prevent rapid switching - debounce mechanism
            if (this.switchingObjective) {
                return;
            }

            // Rate limiting - prevent switches faster than 300ms
            const now = Date.now();
            if (now - this.lastSwitchTime < 300) {
                return;
            }
            this.lastSwitchTime = now;

            try {
                this.switchingObjective = true;
                this.isTransitioning = true;

                // Determine if target objective is completed (read-only)
                const isTargetCompleted = index < this.sessionCurrentObjectiveIndex ||
                                        (this.completedObjectives === this.totalObjectives && index < this.totalObjectives);

                this.currentObjectiveIndex = index;
                this.currentObjective = this.objectives[index];
                this.isViewingCompletedObjective = isTargetCompleted;

                // Handle WebSocket connection based on objective type
                if (isTargetCompleted) {
                    // COMPLETED OBJECTIVE: Read-only mode, keep WebSocket connected but set read-only flag
                    this.isViewingCompletedObjective = true;
                } else {
                    // ACTIVE OBJECTIVE: Ensure WebSocket is connected
                    this.isViewingCompletedObjective = false;
                }

                // Clear messages array
                this.messages = [];

                // Fetch messages for the new objective
                await this.fetchObjectiveMessages();

                // Update message count for this objective
                const response = await fetch(`${API_BASE_URL}/api/objective-messages/${this.session_uuid}/${index}/`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    this.objectiveMessageCounts[index] = data.message_count;
                }

                // Ensure WebSocket is connected for the session (regardless of objective)
                // The connection is session-wide, not objective-specific
                if (!this.chatSocket || !this.isConnected) {
                    this.connectWebSocket();
                }

            } catch (error) {
                console.error('Error switching to objective:', error);
                this.errorMessage = 'Error switching objectives. Please refresh the page.';
            } finally {
                // Always reset switching state
                this.switchingObjective = false;
                this.isTransitioning = false;
            }
        },
        async fetchAllObjectiveMessageCounts() {
            // Note: Initial message counts are now fetched with session data
            // This method is used for refreshing counts when needed

            // Create parallel API calls for all objectives
            const fetchPromises = this.objectives.map(async (_, index) => {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/objective-messages/${this.session_uuid}/${index}/`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
                        },
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        return { index, count: data.message_count };
                    }
                    return { index, count: 0 };
                } catch (error) {
                    console.error(`Error fetching message count for objective ${index}:`, error);
                    return { index, count: 0 };
                }
            });
            
            // Wait for all requests to complete
            const results = await Promise.all(fetchPromises);
            
            // Update message counts
            results.forEach(({ index, count }) => {
                this.objectiveMessageCounts[index] = count;
            });
        },
        
        // Session completion methods
        async voteToEndSession() {
            try {
                const { voteToEndSession } = await import('../api.js');
                const response = await voteToEndSession(this.session_uuid, 'vote');
                
                if (response.session_ending) {
                    // Update completion status - all objectives are now completed
                    this.completedObjectives = this.totalObjectives;

                    this.isInSummaryPhase = true;
                    this.currentObjectiveIndex = this.totalObjectives; // Move to summary view
                    await this.fetchSessionSummary();
                }
                
                this.showSessionMessage(response.message);
            } catch (error) {
                console.error('Error voting to end session:', error);
                this.errorMessage = error.message || 'Failed to vote to end session';
            }
        },
        
        async rejectEndSessionVote() {
            try {
                const { voteToEndSession } = await import('../api.js');
                const response = await voteToEndSession(this.session_uuid, 'reject');
                this.showSessionMessage(response.message);
            } catch (error) {
                console.error('Error rejecting end session vote:', error);
                this.errorMessage = error.message || 'Failed to reject vote';
            }
        },
        
        async submitSummaryResponse(responseText) {
            if (!responseText.trim() || responseText.length < 10) {
                this.errorMessage = 'Please provide at least one sentence about how you feel now';
                return;
            }

            try {
                const { submitSummaryResponse } = await import('../api.js');
                const response = await submitSummaryResponse(this.session_uuid, responseText);

                this.userHasSubmittedSummary = true;
                this.allSubmittedSummary = response.all_submitted;

                if (response.summary_generated) {
                    this.summaryGenerated = true;
                    this.finalSummary = response.final_summary;
                }

                await this.fetchSessionSummary(); // Refresh summary data
                this.showSessionMessage(response.message);
            } catch (error) {
                console.error('Error submitting summary response:', error);
                this.errorMessage = error.message || 'Failed to submit response';
            }
        },
        
        async fetchSessionSummary() {
            try {
                const { getSessionSummary } = await import('../api.js');
                const response = await getSessionSummary(this.session_uuid);
                
                this.summaryData = response;
                this.summaryResponses = response.summary_responses || [];
                this.userHasSubmittedSummary = response.user_has_submitted;
                this.allSubmittedSummary = response.all_submitted;
                this.summaryGenerated = response.summary_generated;
                this.finalSummary = response.final_summary || '';
                this.endSessionVotes = response.end_session_votes || {};
                this.endSessionVoteActive = response.end_session_vote_active;
                this.endSessionVoteInitiatedBy = response.vote_initiated_by || '';
                
                // Check if current user has voted
                this.hasVotedToEndSession = this.authStore.user?.uid in this.endSessionVotes;
            } catch (error) {
                console.error('Error fetching session summary:', error);
                this.errorMessage = 'Failed to load session summary';
            }
        },
        
        navigateToHome() {
            this.$router.push({ name: 'home' });
        },
        
        navigateToNewSession() {
            this.$router.push({ name: 'startsession' });
        },
        
        handleEndSessionVoteUpdate(data) {
            if (data.vote_data.session_uuid === this.session_uuid) {
                // Update vote state
                this.endSessionVotes = data.vote_data.end_session_votes || {};
                this.endSessionVoteActive = data.vote_data.vote_active;
                this.endSessionVoteInitiatedBy = data.vote_data.vote_initiated_by || '';
                this.endSessionVoteInitiatedByDisplay = data.vote_data.vote_initiated_by_display || '';

                // Handle session ending - BOTH users should move to summary
                if (data.vote_data.vote_action === 'session_ending') {

                    // Update completion status - the last objective is now completed
                    this.completedObjectives = this.totalObjectives;

                    // Move to summary phase
                    this.isInSummaryPhase = true;
                    this.currentObjectiveIndex = this.totalObjectives; // Move to summary view
                    this.fetchSessionSummary();
                }
                
                // Show message about vote
                const voterName = data.vote_data.voter_display_name;
                const action = data.vote_data.vote_action;
                
                if (action === 'vote_initiated') {
                    this.showSessionMessage(`${voterName} proposed to end the session`);
                } else if (action === 'vote_cast') {
                    this.showSessionMessage(`${voterName} accepted to end the session`);
                } else if (action === 'vote_rejected') {
                    this.showSessionMessage(`${voterName} declined to end the session`);
                } else if (action === 'session_ending') {
                    this.showSessionMessage('All participants agreed to end the session. Moving to summary...');
                }
                
                // Force reactivity update
                this.$forceUpdate();
            }
        },
        
        async handleSessionSummaryGenerated(data) {
            if (data.session_uuid === this.session_uuid) {
                this.summaryGenerated = true;
                this.finalSummary = data.final_summary;
                this.showSessionMessage('Session summary has been generated!');

                // Clear any "generating" messages
                if (this.errorMessage.includes('generating')) {
                    this.errorMessage = '';
                }

                // Refresh summary data to ensure we have the latest state
                try {
                    await this.fetchSessionSummary();
                } catch (error) {
                    console.error('Failed to refresh summary data:', error);
                }

                // Force reactivity update
                this.$forceUpdate();
            }
        },

        handleSessionSummaryGenerating(data) {
            if (data.session_uuid === this.session_uuid) {
                // Update state so both users see the generating indicator
                this.allSubmittedSummary = true;

                this.showSessionMessage(data.message || 'AI is generating your session summary...');

                // Also show in error message area for visibility
                this.errorMessage = 'AI is generating your session summary, please wait...';

                // Force reactivity update to ensure UI updates
                this.$forceUpdate();
            }
        },

        handleSessionSummaryError(data) {
            if (data.session_uuid === this.session_uuid) {
                this.errorMessage = data.error_message || 'Failed to generate session summary. Please refresh the page.';

                // Auto-clear error message after 10 seconds
                setTimeout(() => {
                    if (this.errorMessage.includes('Failed to generate session summary')) {
                        this.errorMessage = '';
                    }
                }, 10000);
            }
        },

        handleObjectiveCompletion(data) {
            if (data.completion_data.session_uuid === this.session_uuid) {
                const completionData = data.completion_data;

                // Update completed objectives count
                this.completedObjectives = completionData.completed_objectives;

                // Update session current objective index
                this.sessionCurrentObjectiveIndex = completionData.current_objective_index;

                // Show completion message
                this.showSessionMessage(`Objective ${completionData.objective_index + 1} completed!`);

                // Force reactivity update
                this.$forceUpdate();
            }
        },

        handleSessionInvitationRejected(data) {
            if (data.session.session_uuid === this.session_uuid) {
                // Update session status to rejected
                this.sessionStatus = 'rejected';

                // Show notification
                this.showSessionMessage(`Session invitation was rejected by ${data.session.rejected_by}`);

                // Force reactivity update
                this.$forceUpdate();
            }
        }
    },
    props: {
        session_uuid: {
            type: String,
            required: true,
        }
    }
}
</script>

<template>
  <div v-if="authStore.isAuthenticated" class="h-screen bg-white flex">
    <!-- Loading State -->
    <div v-if="isCheckingMembership" class="h-full w-full flex items-center justify-center">
      <div class="text-center">
        <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </div>
        <h2 class="text-lg font-medium text-gray-900 mb-2">Loading Session...</h2>
        <p class="text-sm text-gray-600">Checking your access to this counseling session</p>
      </div>
    </div>

    <!-- Main Chat Interface -->
    <div v-else-if="isCorrectUser" class="h-full flex w-full">
      <!-- Left Sidebar with Objectives -->
      <ObjectiveSidebar
        :objectives="objectives"
        :current-objective-index="currentObjectiveIndex"
        :session-current-objective-index="sessionCurrentObjectiveIndex"
        :completed-objectives="completedObjectives"
        :total-objectives="totalObjectives"
        :objective-message-counts="objectiveMessageCounts"
        :message-limit="messageLimit"
        :summary-state="summaryState"
        :show-summary-in-sidebar="showSummaryInSidebar"
        :is-viewing-summary="isViewingSummary"
        :is-ai-talking="turnState.status === 'waiting_for_ai' || isLlmTyping"
        @objective-selected="switchToObjective"
        @summary-selected="currentObjectiveIndex = totalObjectives"
      />

      <!-- Main Chat Area -->
      <div class="flex-1 flex flex-col">
        <!-- Chat Interface (when NOT viewing summary) -->
        <template v-if="!isViewingSummary">
          <!-- Chat Header -->
          <ChatHeader
            :current-objective-index="currentObjectiveIndex"
            :current-objective="currentObjective"
            :status-message="statusMessage"
            :is-connected="isConnected"
            :total-message-count="totalMessageCount"
            :message-limit="messageLimit"
            :can-move-to-next-objective="canMoveToNextObjective"
            :num-messages-for-voting-threshold="numMessagesForVotingThreshold"
            :session-current-objective-index="sessionCurrentObjectiveIndex"
            :total-objectives="totalObjectives"
            :is-current-objective-read-only="isCurrentObjectiveReadOnly"
            :is-ai-talking="turnState.status === 'waiting_for_ai' || isLlmTyping"
            :is-transitioning="isTransitioning"
            :move-to-next-votes="moveToNextVotes"
            :vote-active="voteActive"
            @move-to-next="voteToMoveNext"
          />

          <!-- Error Message -->
          <div v-if="errorMessage" class="px-6 py-3 bg-red-50 border-b border-red-200 text-sm text-red-800 text-center">
            {{ errorMessage }}
          </div>

          <!-- Voting Banner -->
          <VoteBanner
            :vote-active="voteActive"
            :vote-initiated-by-display="voteInitiatedByDisplay"
            :has-voted="hasVotedToMoveNext"
            :is-transitioning="isTransitioning"
            :move-to-next-votes="moveToNextVotes"
            :is-ai-talking="turnState.status === 'waiting_for_ai' || isLlmTyping"
            @agree="voteToMoveNext"
            @reject="rejectVote"
          />

          <!-- Chat Messages -->
          <MessageList
            ref="messageList"
            :messages="messages"
            :current-objective-index="currentObjectiveIndex"
            :current-objective="currentObjective"
            :current-user="authStore.user"
            :is-llm-typing="isLlmTyping"
            :typing-message="typingMessage"
          />

          <!-- End Session Voting Section -->
          <EndSessionVoting
            :can-end-session="canEndSession"
            :end-session-vote-active="endSessionVoteActive"
            :end-session-vote-initiated-by="endSessionVoteInitiatedBy"
            :end-session-vote-initiated-by-display="endSessionVoteInitiatedByDisplay"
            :has-voted-to-end-session="hasVotedToEndSession"
            :end-session-votes="endSessionVotes"
            :current-user="authStore.user"
            :show-debug-info="true"
            :is-ai-talking="turnState.status === 'waiting_for_ai' || isLlmTyping"
            @vote-to-end-session="voteToEndSession"
            @reject-end-session-vote="rejectEndSessionVote"
          />

          <!-- Message Input -->
          <MessageInput
            :can-type-message="canTypeMessage"
            :placeholder="inputPlaceholder"
            @send-message="sendMessage"
          />
        </template>

        <!-- Summary Content (when viewing summary) - Full page replacement -->
        <SessionSummary
          v-if="isViewingSummary"
          :summary-data="summaryData"
          :user-has-submitted-summary="userHasSubmittedSummary"
          :all-submitted-summary="allSubmittedSummary"
          :summary-responses="summaryResponses"
          :summary-generated="summaryGenerated"
          :final-summary="finalSummary"
          @submit-response="submitSummaryResponse"
          @navigate-to-home="navigateToHome"
          @navigate-to-new-session="navigateToNewSession"
        />
      </div>
    </div>

    <!-- Access Restricted View -->
    <div v-else class="h-full flex items-center justify-center">
      <div class="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md mx-4">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m9-9a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Access Restricted</h2>
        <p class="text-gray-600 mb-4">
          You don't have access to this counseling session.
        </p>
        <div class="space-y-3">
          <router-link 
            :to="{ name: 'reflection', params: { session_uuid: session_uuid } }"
            class="block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Complete Reflection
          </router-link>
          <router-link 
            to="/"
            class="block px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Back to Home
          </router-link>
        </div>
      </div>
    </div>
  </div>

  <!-- Not Logged In View -->
  <div v-else class="h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
    <div class="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md mx-4">
      <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>
      </div>
      <h2 class="text-xl font-semibold text-gray-900 mb-4">Authentication Required</h2>
      <p class="text-gray-600 mb-6">
        You need to be logged in to access this counseling session.
      </p>
      <div class="space-y-3">
        <router-link 
          to="/login"
          class="block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Login
        </router-link>
        <router-link 
          to="/register"
          class="block px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          Register
        </router-link>
      </div>
    </div>
  </div>
</template>


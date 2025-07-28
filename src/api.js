import { resolveComponent } from "vue";
import { useAuthStore } from "./authentication/auth";

// Export the base URL so it can be imported in other components
// You can change this single line for deployment:
// export const API_BASE_URL = 'https://your-production-domain.com'
// Or use environment variables: export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
export const API_BASE_URL = 'http://localhost:8000'
const url = API_BASE_URL

function getAuthHeaders() {
    const token = localStorage.getItem('idToken');

    const headers = {
        'Content-Type' : 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}
// POSTs  categories and context
// Returns counselling session id
export async function startCounsellingSession(categories, context, partner_id, partner_message) {
    const headers = getAuthHeaders();
    
    const response = await fetch(`${url}/api/start-counselling-session/`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            categories: categories,
            context: context,
            partner_id: partner_id,
            partner_message: partner_message
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to start counselling session');
    }

    return await response.json();
}

// Objective Generation API functions
export async function generateObjectives(categories, context, partner_name, partner_relationship) {
    const headers = getAuthHeaders();
    
    const response = await fetch(`${url}/api/generate-objectives/`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            categories: categories,
            context: context,
            partner_name: partner_name,
            partner_relationship: partner_relationship
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate objectives');
    }

    return await response.json();
}

export async function refineObjectives(current_objectives, user_feedback) {
    const headers = getAuthHeaders();
    
    const response = await fetch(`${url}/api/refine-objectives/`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            current_objectives: current_objectives,
            user_feedback: user_feedback
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to refine objectives');
    }

    return await response.json();
}

export async function createSessionWithObjectives(categories, context, objectives, partner_id, partner_message) {
    const headers = getAuthHeaders();
    
    const response = await fetch(`${url}/api/create-session-with-objectives/`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            categories: categories,
            context: context,
            objectives: objectives,
            partner_id: partner_id,
            partner_message: partner_message
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create session with objectives');
    }

    return await response.json();
}

// @TODO
// Investigate if session uuid is the best to create a reflection or chat
export async function storeReflection(feelings,hopes,session_uuid) {
    try {
        const headers = getAuthHeaders();
        
        const response = await fetch(`${url}/api/submit-reflection/`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                session_uuid: session_uuid,
                feelings: feelings,
                hopes: hopes
            }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        // just http status
        const data = await response.json();
        return data;
    } catch(error) {
        console.error('Error starting counselling session:', error);
        throw error;
    }
}

export async function checkUser(session_uuid) {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${url}/api/check-session-user/`,{
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                session_uuid:session_uuid
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error starting chat session:', error);
        throw error;
    }
}

export async function getMessages(session_uuid) {
    const headers = getAuthHeaders();
    try {
        const response = await fetch(`${url}/api/get-messages/${session_uuid}`, {
            method:'GET',
            headers: headers,
        });
    
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data;  // Return full response including chat_history and participants

    } catch(error) {
        console.error('Error getting messages:', error);
        throw error
    }
}

export async function getUserSessions() {
    try {
        const headers = getAuthHeaders();
        
        const response = await fetch(`${url}/api/user-sessions/`, {
            method: 'GET',
            headers: headers,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching user sessions:', error);
        throw error;
    }
}

// Relationship Management API functions
export async function getUserNetwork() {
    const headers = getAuthHeaders();

    
    const response = await fetch(`${url}/api/user-network/`, {
        method: 'GET',
        headers: headers,
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch user network');
    }
    
    return await response.json();
}

export async function sendRelationshipInvitation(invitationData) {
    const headers = getAuthHeaders();
    const response = await fetch(`${url}/api/send-relationship-invitation/`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(invitationData),
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send invitation');
    }
    
    return await response.json();
}

export async function respondToRelationshipInvitation(invitationUuid, action) {
    const headers = getAuthHeaders();

    const response = await fetch(`${url}/api/respond-to-relationship-invitation/`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            invitation_uuid: invitationUuid,
            action: action
        }),
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to ${action} invitation`);
    }
    
    return await response.json();
}

export async function cancelRelationshipInvitation(invitationUuid) {
    const headers = getAuthHeaders();

    
    const response = await fetch(`${url}/api/cancel-relationship-invitation/${invitationUuid}/`, {
        method: 'DELETE',
        headers: headers,
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to cancel invitation');
    }
    
    return await response.json();
}

export async function removeRelationship(relationshipId) {
    const headers = getAuthHeaders();

    const response = await fetch(`${url}/api/remove-relationship/${relationshipId}/`, {
        method: 'DELETE',
        headers: headers,
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to remove relationship');
    }
    
    return await response.json();
}

export async function getRelationshipDetails(relationshipId) {
    const headers = getAuthHeaders();
    const response = await fetch(`${url}/api/relationship-detail/${relationshipId}/`, {
        method: 'GET',
        headers: headers,
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch relationship details');
    }
    
    return await response.json();
}

export async function updateRelationship(relationshipId, updateData) {
    const headers = getAuthHeaders();
    const response = await fetch(`${url}/api/relationship-detail/${relationshipId}/`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update relationship');
    }
    
    return await response.json();
}

// Session invitation management functions
export async function getUserRelationshipsForSession() {
    const headers = getAuthHeaders();

    const response = await fetch(`${url}/api/user-relationships-for-session/`, {
        method: 'GET',
        headers: headers,
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch relationships for session');
    }
    
    return await response.json();
}

export async function getSessionTurnState(session_uuid) {
    const headers = getAuthHeaders();
    try {
        const response = await fetch(`${url}/api/session-turn-state/${session_uuid}/`, {
            method: 'GET',
            headers: headers,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data.turn_state;
    } catch (error) {
        console.error('Error fetching session turn state:', error);
        throw error;
    }
}

export async function deleteSession(session_uuid) {
    try {
        const headers = getAuthHeaders();


        const response = await fetch(`${url}/api/delete-session/${session_uuid}/`, {
            method: 'DELETE',
            headers: headers,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error deleting session:', error);
        throw error;
    }
}

export async function deleteUserAccount() {
    try {
        const headers = getAuthHeaders();

        const response = await fetch(`${url}/api/delete-account`, {
            method: 'DELETE',
            headers: headers,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to delete account');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error deleting user account:', error);
        throw error;
    }
}

export async function getUserSessionInvitations() {
    const headers = getAuthHeaders();
    const response = await fetch(`${url}/api/user-session-invitations/`, {
        method: 'GET',
        headers: headers,
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch session invitations');
    }
    
    return await response.json();
}

export async function respondToSessionInvitation(invitationUuid, action) {
    const headers = getAuthHeaders();    
    const response = await fetch(`${url}/api/respond-session-invitation/`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            invitation_uuid: invitationUuid,
            action: action
        }),
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to ${action} session invitation`);
    }
    
    return await response.json();
}

// Session completion API functions
export async function voteToEndSession(sessionUuid, action = 'vote') {
    const headers = getAuthHeaders();

    const response = await fetch(`${url}/api/vote-end-session/${sessionUuid}/`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            action: action
        }),
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to vote to end session');
    }
    
    return await response.json();
}

export async function submitSummaryResponse(sessionUuid, howYouFeelNow) {
    const headers = getAuthHeaders();

    const response = await fetch(`${url}/api/submit-summary-response/${sessionUuid}/`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            how_you_feel_now: howYouFeelNow
        }),
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to submit summary response');
    }
    
    return await response.json();
}

export async function getSessionSummary(sessionUuid) {
    const headers = getAuthHeaders();

    const response = await fetch(`${url}/api/get-session-summary/${sessionUuid}/`, {
        method: 'GET',
        headers: headers,
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get session summary');
    }
    
    return await response.json();
}
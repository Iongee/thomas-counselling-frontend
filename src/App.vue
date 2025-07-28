<!-- src/App.vue -->
<script setup>
import Navbar from "./components/Navbar.vue"
// import NotificationContainer from "./components/NotificationContainer.vue"
</script>

<template>
  <div id="app">
    <Navbar />
    <router-view />
    <!-- <NotificationContainer /> -->
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
  background: transparent;
}
</style>

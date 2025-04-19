<script lang="ts">
  export let size = 32; // size in pixels
  export let className = ""; // additional classes
</script>

<div 
  class="app-icon {className}"
  style="width: {size}px; height: {size}px;"
>
  <div class="pin-wrapper">
    <div class="pin-top"></div>
    <div class="pin-bottom"></div>
  </div>
</div>

<style>
  .app-icon {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 30%;
    background: linear-gradient(135deg, #6366f1, #a855f7);
    overflow: hidden;
  }
  
  .pin-wrapper {
    width: 60%;
    height: 60%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .pin-top {
    width: 60%;
    height: 60%;
    background-color: white;
    border-radius: 50%;
    position: relative;
    z-index: 2;
  }
  
  .pin-bottom {
    width: 40%;
    height: 50%;
    background-color: white;
    clip-path: polygon(0% 0%, 100% 0%, 50% 100%);
    margin-top: -10%;
    position: relative;
    z-index: 1;
  }
</style>
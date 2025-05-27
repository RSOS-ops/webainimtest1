// Tamino Martinius - All rights reserved
// Copyright © 2013 Tamino Martinius (http://zaku.eu)
// Copyright © 2013 Particleslider.com (http://particleslider.com)
// Terms of usage: http://particleslider.com/legal/license

var init = function(){
  var isMobile = navigator.userAgent &&
    navigator.userAgent.toLowerCase().indexOf('mobile') >= 0;
  var isSmall = window.innerWidth < 1000;

  var ps; // Define ps outside try block to widen its scope if needed

  try {
    console.log("Attempting to initialize ParticleSlider...");
    ps = new ParticleSlider({
      ptlGap: isMobile || isSmall ? 3 : 0,
      ptlSize: isMobile || isSmall ? 3 : 1,
      width: 1e9, 
      height: 1e9 
    });
    console.log("ParticleSlider initialized successfully:", ps);
  } catch (e) {
    console.error("Error initializing ParticleSlider:", e);
    // Optionally, display a message to the user on the page itself
    // document.body.innerHTML = '<p>Error initializing ParticleSlider. Is ps-0.9.js loaded?</p>';
    return; // Stop further execution if ParticleSlider fails
  }

  try {
    console.log("Attempting to initialize dat.GUI...");
    if (typeof dat === 'undefined') {
      console.warn('dat.GUI not found. UI controls might not be available or may error. Attempting to create a mock GUI to prevent runtime errors.');
      window.dat = { 
          GUI: function() { 
              this.add = function(obj, prop) { 
                  console.log('Mock dat.GUI: add called for', prop);
                  return { onChange: function(){}, min: function(){ return this; }, max: function(){ return this; }, step: function(){ return this; } }; 
              }; 
              this.addColor = function(obj, prop) { 
                  console.log('Mock dat.GUI: addColor called for', prop);
                  return { onChange: function(){} }; 
              }; 
          } 
      };
    }
    var gui = new dat.GUI();
    gui.add(ps, 'ptlGap').min(0).max(5).step(1).onChange(function(){
      ps.init(true);
    });
    gui.add(ps, 'ptlSize').min(1).max(5).step(1).onChange(function(){
      ps.init(true);
    });
    gui.add(ps, 'restless');
    gui.addColor(ps, 'color').onChange(function(value){
      ps.monochrome = true;
      ps.setColor(value);
      ps.init(true);
    });
    console.log("dat.GUI setup complete.");
  } catch (e) {
    console.error("Error setting up dat.GUI:", e);
  }

  (window.addEventListener
   ? window.addEventListener('click', function(){ps.init(true)}, false)
   : window.onclick = function(){ps.init(true)});
};

var initParticleSlider = function(){
  var psScript = document.createElement('script');
  (psScript.addEventListener
    ? psScript.addEventListener('load', init, false)
    : psScript.onload = init);
  psScript.src = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/23500/ps-0.9.js';
  psScript.setAttribute('type', 'text/javascript');
  document.body.appendChild(psScript);
}

(window.addEventListener
  ? window.addEventListener('load', initParticleSlider, false)
  : window.onload = initParticleSlider);

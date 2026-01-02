import { ZoomMtg } from "@zoom/meetingsdk";
const testTool = window.testTool;

// Update loading status
function updateLoadingStatus(text, details = '') {
  const loadingText = document.getElementById('loading-text');
  const loadingDetails = document.getElementById('loading-details');
  if (loadingText) loadingText.textContent = text;
  if (loadingDetails) loadingDetails.textContent = details;
  console.log(text, details);
}

// Show error
function showError(message) {
  const errorContainer = document.getElementById('error-container');
  if (errorContainer) {
    errorContainer.innerHTML = `
      <div class="error-message">
        <h3>❌ Meeting Join Failed</h3>
        <p>${message}</p>
        <button class="back-button" onclick="window.location.href='/'">← Go Back</button>
      </div>
    `;
  }
  console.error('Meeting error:', message);
}

// Hide loading overlay
function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

updateLoadingStatus('Loading meeting configuration...', 'Parsing URL parameters');

// get meeting args from url
const tmpArgs = testTool.parseQuery();
const meetingConfig = {
  meetingNumber: tmpArgs.mn,
  userName: (function () {
    if (tmpArgs.name) {
      try {
        return testTool.b64DecodeUnicode(tmpArgs.name);
      } catch (e) {
        return tmpArgs.name;
      }
    }
    return (
      "CDN#" +
      tmpArgs.version +
      "#" +
      testTool.detectOS() +
      "#" +
      testTool.getBrowserInfo()
    );
  })(),
  passWord: tmpArgs.pwd,
  leaveUrl: "/index.html",
  role: parseInt(tmpArgs.role, 10),
  userEmail: (function () {
    try {
      return testTool.b64DecodeUnicode(tmpArgs.email);
    } catch (e) {
      return tmpArgs.email;
    }
  })(),
  lang: tmpArgs.lang,
  signature: tmpArgs.signature || "",
  china: tmpArgs.china === "1",
};

console.log(JSON.stringify(ZoomMtg.checkSystemRequirements()));

updateLoadingStatus('Checking system requirements...', 'Verifying browser compatibility');

// it's option if you want to change the MeetingSDK-Web dependency link resources. setZoomJSLib must be run at first
// ZoomMtg.setZoomJSLib("https://source.zoom.us/{VERSION}/lib", "/av"); // default, don't need call it
if (meetingConfig.china)
  ZoomMtg.setZoomJSLib("https://jssdk.zoomus.cn/5.0.4/lib", "/av"); // china cdn option

updateLoadingStatus('Preloading SDK resources...', 'Loading WebAssembly modules');

ZoomMtg.preLoadWasm();
ZoomMtg.prepareWebSDK();

function beginJoin(signature) {
  updateLoadingStatus('Initializing Zoom SDK...', 'Loading meeting interface');
  
  // https://developers.zoom.us/docs/meeting-sdk/web/client-view/multi-language/
  ZoomMtg.i18n.load(meetingConfig.lang);
  ZoomMtg.i18n.onLoad(function () {
    updateLoadingStatus('Configuring meeting...', 'Setting up connection');
    
    ZoomMtg.init({
      leaveUrl: meetingConfig.leaveUrl,
      disableCORP: !window.crossOriginIsolated, // default true
      // disablePreview: false, // default false
      externalLinkPage: "./externalLinkPage.html",
      success: function () {
        updateLoadingStatus('Joining meeting...', `Meeting ID: ${meetingConfig.meetingNumber}`);
        console.log(meetingConfig);
        console.log("signature", signature);
        
        // Hide loading overlay after a short delay
        setTimeout(() => {
          hideLoadingOverlay();
        }, 500);
        
        console.log("🚀 Attempting to join meeting with config:", {
          meetingNumber: meetingConfig.meetingNumber,
          userName: meetingConfig.userName,
          passWord: meetingConfig.passWord ? "***" : "MISSING",
          signature: signature ? "Present" : "MISSING"
        });
        
        ZoomMtg.join({
          meetingNumber: meetingConfig.meetingNumber,
          userName: meetingConfig.userName,
          signature: signature,
          userEmail: meetingConfig.userEmail,
          passWord: meetingConfig.passWord,
          success: function (res) {
            console.log("✅ join meeting success", res);
            hideLoadingOverlay();
            ZoomMtg.getAttendeeslist({});
            ZoomMtg.getCurrentUser({
              success: function (res) {
                console.log("success getCurrentUser", res.result.currentUser);
              },
            });
          },
          error: function (res) {
            console.error("❌ join meeting error", res);
            console.error("Full error details:", JSON.stringify(res, null, 2));
            showError(`Failed to join meeting: ${res.errorMessage || res.reason || JSON.stringify(res) || 'Unknown error'}. Please check your meeting ID and password.`);
          },
        });
      },
      error: function (res) {
        console.error("❌ init error", res);
        showError(`SDK initialization failed: ${res.errorMessage || res.reason || 'Unknown error'}. Please refresh and try again.`);
      },
    });

    ZoomMtg.inMeetingServiceListener("onUserJoin", function (data) {
      console.log("inMeetingServiceListener onUserJoin", data);
    });

    ZoomMtg.inMeetingServiceListener("onUserLeave", function (data) {
      console.log("inMeetingServiceListener onUserLeave", data);
    });

    ZoomMtg.inMeetingServiceListener("onUserIsInWaitingRoom", function (data) {
      console.log("inMeetingServiceListener onUserIsInWaitingRoom", data);
    });

    ZoomMtg.inMeetingServiceListener("onMeetingStatus", function (data) {
      console.log("inMeetingServiceListener onMeetingStatus", data);
    });
  });
}

beginJoin(meetingConfig.signature);

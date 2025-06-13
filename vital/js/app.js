document.addEventListener('DOMContentLoaded', () => {
// Vital IT - Advanced Transcription UI JavaScript

// API Keys and Configuration
const OPENAI_API_KEY = ""; 
const GOOGLE_API_KEY = ""; 
const EMILIOSTT_API_KEY = "";

const firebaseConfig = {
  apiKey: "AIzaSyCjVuc2VD5YvJE_4PBUJATmKiJzFC1ex8c",
  authDomain: "aitek2023-8f504.firebaseapp.com",
  databaseURL: "https://aitek2023-8f504-default-rtdb.firebaseio.com",
  projectId: "aitek2023-8f504",
  storageBucket: "aitek2023-8f504.appspot.com",
  messagingSenderId: "570516064142",
  appId: "1:570516064142:web:383ef4de00b5f48f5886df",
  measurementId: "G-PFSD6YN1TV"
};

firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();
const storageRef = storage.ref();

const MAX_CHUNK_DURATION_SECONDS_OPENAI = 100; 
const MEDIA_RECORDER_TIMESLICE_MS = 3000; 

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingMessage = document.getElementById('loadingMessage');
const themeToggleCheckbox = document.getElementById('themeToggleCheckbox');
const statusDisplayText = document.getElementById('statusDisplayText');
const startRecordBtn = document.getElementById('startRecordBtn');
const pauseRecordBtn = document.getElementById('pauseRecordBtn');
const resumeRecordBtn = document.getElementById('resumeRecordBtn');
const stopRecordBtn = document.getElementById('stopRecordBtn');
const sttServiceSelect = document.getElementById('sttServiceSelect');

const transcriptOutputConvo = document.getElementById('transcriptOutputConvo');
const transcriptOutputMultispeaker = document.getElementById('transcriptOutputMultispeaker');
const detectedTopicsList = document.getElementById('detectedTopicsList'); 

const topicMedicalCheckbox = document.getElementById('topicMedical');
const topicGeneralCheckbox = document.getElementById('topicGeneral');

const uploadAudioBtn = document.getElementById('uploadAudioBtn');
const audioFileUpload = document.getElementById('audioFileUpload');
const fileNameDisplay = document.getElementById('fileNameDisplay');

const waveformCanvas = document.getElementById('audioWaveformCanvas');
const waveformCtx = waveformCanvas.getContext('2d');

const recordedAudioList = document.getElementById('recordedAudioList'); 

const analysisContainer = document.getElementById('analysisContainer');

// Audio Processing Variables
let audioContext; 
let vadAnalyserNode; 
let vadProcessorNode; 
let mediaStreamSourceForWaveform;
let mediaStreamSourceForVAD; 
let analyserForWaveform;
let dataArrayForWaveform;
let animationFrameId;

let mediaRecorder;
let allRecordedBlobs = []; 
let currentStream = null; 
let recordingState = 'idle'; 

// Database Configuration
const DB_NAME = 'FinlaAudioDB_VAD_Firebase_Topics'; 
const STORE_NAME = 'audioFiles';
let db;

// Voice Activity Detection
const VAD_SILENCE_THRESHOLD = 0.01; 
const VAD_MIN_SPEECH_DURATION_MS = 200; 
let vadIsSpeaking = false;
let vadSpeechStartTime = 0;
let activeSpeechSegments = []; 

// Topic Keywords
const TOPIC_KEYWORDS_LOCAL = { 
    medical: [
        'doctor', 'clinic', 'hospital', 'polyclinic', 'singhealth', 'nuhs', 'healthhub', 'medisave', 'medishield', 
        'appointment', 'prescription', 'diagnosis', 'treatment', 'referral', 'medical certificate', 'mc', 
        'vaccination', 'health screening', 'physiotherapy', 'ward', 'icu', 'a&e', 'emergency', 'specialist',
        'general practitioner', 'gp', 'pharmacy', 'medication', 'symptom', 'illness', 'disease', 'insurance claim health',
        'integrated shield plan', 'careshield'
    ],
};

// Analysis Prompts
const ANALYZER_PROMPTS = [
    {
        label: "Analyzer 1: Meeting Summary",
        prompt: "Based on the following transcript, provide a concise summary of the meeting's main purpose and key discussion points."
    },
    {
        label: "Analyzer 2: Action Items",
        prompt: "Extract all explicit and implicit action items from the transcript. For each item, identify the responsible person(s) and any mentioned deadlines. Format as a list. If none, state that."
    },
    {
        label: "Analyzer 3: Sentiment Analysis",
        prompt: "Perform a sentiment analysis of the conversation in the transcript. Is the overall sentiment positive, negative, or neutral? Identify key phrases or statements that support your analysis."
    },
    {
        label: "Analyzer 4: Key Questions",
        prompt: "List the most significant questions asked during the conversation, as recorded in the transcript. Note who asked the question if the information is available."
    },
    {
        label: "Analyzer 5: Decisions Made",
        prompt: "Summarize the key decisions that were made during the conversation documented in the transcript. If no clear decisions were made, state that."
    },
    {
        label: "Analyzer 6: Potential Clients/Partners",
        prompt: "From the transcript, identify any potential clients, partners, or customer segments mentioned or implied. List them and explain the reasoning based on the text."
    },
    {
        label: "Analyzer 7: Risks & Concerns",
        prompt: "Identify and list any risks, concerns, or objections raised in the transcript. Summarize each one clearly."
    },
    {
        label: "Analyzer 8: Proposed Solutions",
        prompt: "Analyze the transcript to determine the core needs or problems discussed. Based on these, suggest the most compelling product, service, or solution that could be offered. Detail the suggestion and why it's suitable."
    },
    {
        label: "Analyzer 9: Competitor Mentions",
        prompt: "Scan the transcript for any mentions of competitors or competing products/services. List each mention and the context in which it appeared."
    },
    {
        label: "Analyzer 10: Follow-up Email Draft",
        prompt: "Using the information in the transcript, draft a professional, concise follow-up email. The email should summarize the key discussion points, decisions, and action items for the attendees."
    },
    {
        label: "Analyzer 11: Customer Satisfaction",
        prompt: "Based on the transcript, analyze the customer's satisfaction level. What are their likes and dislikes? Provide specific examples from the text."
    },
    {
        label: "Analyzer 12: Product Feedback",
        prompt: "Extract any feedback about the product or service being discussed. Categorize the feedback as positive, negative, or neutral, and provide supporting quotes."
    },
    {
        label: "Analyzer 13: Areas for Improvement",
        prompt: "Identify areas where the product, service, or process could be improved based on the conversation in the transcript. Suggest specific changes or enhancements."
    },
    {
        label: "Analyzer 14: Training Needs",
        prompt: "Determine if there are any training needs for the staff or customers based on the transcript. What skills or knowledge gaps are evident?"
    },
    {
        label: "Analyzer 15: Sales Opportunities",
        prompt: "Identify any potential sales opportunities that arise during the conversation. What products or services could be offered to the customer?"
    },
    {
        label: "Analyzer 16: Marketing Insights",
        prompt: "Extract any marketing insights from the transcript. What are the customer's needs, preferences, and pain points?"
    },
    {
        label: "Analyzer 17: Competitive Advantages",
        prompt: "Identify any competitive advantages that are mentioned or implied in the transcript. What sets the product or service apart from the competition?"
    },
    {
        label: "Analyzer 18: Pricing Strategy",
        prompt: "Analyze the discussion around pricing. Is the customer satisfied with the price? Are there any objections or concerns about the cost?"
    },
    {
        label: "Analyzer 19: Legal Compliance",
        prompt: "Identify any potential legal or compliance issues that are raised in the transcript. Are there any concerns about privacy, security, or data protection?"
    },
    {
        label: "Analyzer 20: Future Trends",
        prompt: "Based on the conversation, what are the future trends or developments that are likely to impact the product, service, or industry?"
    }
];

// Database Functions
function initDB() { 
     return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = event => {
            console.error("IndexedDB error:", event.target.errorCode, event.target.error);
            reject("IndexedDB error: " + event.target.errorCode);
        };
        request.onsuccess = event => {
            db = event.target.result;
            loadAndRenderRecordedAudio(); 
            resolve(db);
        };
        request.onupgradeneeded = event => {
            const store = event.target.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            store.createIndex('name', 'name', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
        };
    });
}

async function saveAudioToDB(blob, name) { 
     if (!db) {
        try {
            await initDB(); 
            if(!db) { 
                 console.error("DB not initialized for saving, and re-init failed.");
                 updateStatus("Error: DB not ready for saving audio.", "error");
                 return;
            }
        } catch (e) {
            console.error("DB initialization failed during save attempt:", e);
            updateStatus("Error: DB not ready for saving audio.", "error");
            return;
        }
    }
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const audioRecord = {
            name: name,
            blob: blob,
            timestamp: new Date().toISOString()
        };
        const request = store.add(audioRecord);
        request.onsuccess = () => {
            console.log(`Audio "${name}" saved to IndexedDB.`);
            loadAndRenderRecordedAudio(); 
            resolve(request.result); 
        };
        request.onerror = event => {
            console.error("Error saving audio to IndexedDB:", event.target.error);
            updateStatus(`Error saving audio to local DB: ${event.target.error.message}`, "error");
            reject(event.target.error);
        };
    });
}

async function uploadAudioToFirebase(blob, firebasePathWithName) { 
    const audioRef = storageRef.child(firebasePathWithName);
    updateStatus(`Saving "${firebasePathWithName.split('/').pop()}" to cloud storage...`, "info");
    try {
        const snapshot = await audioRef.put(blob);
        const downloadURL = await snapshot.ref.getDownloadURL();
        console.log(`Uploaded "${firebasePathWithName}" to Firebase Storage: ${downloadURL}`);
        updateStatus(`Audio saved to cloud: ${firebasePathWithName.split('/').pop()}`, "success");
        return downloadURL;
    } catch (error) {
        console.error("Error uploading to Firebase Storage:", error);
        updateStatus(`Error saving to cloud: ${error.message.substring(0,100)}`, "error");
        throw error; 
    }
 }

// Initialize Database
initDB().then(() => console.log("IndexedDB initialized successfully."))
        .catch(err => console.error("Failed to initialize IndexedDB:", err));

document.getElementById('currentYear').textContent = new Date().getFullYear();

// UI Functions
function showLoading(context = "Processing") { 
    if (context === "recording_start") {
        return; 
    }
    let message;
    switch (context) {
        case "mic_request": message = "Requesting microphone..."; break;
        case "finalizing_recording": message = "Finalizing audio..."; break;
        case "decoding": message = "Decoding audio..."; break;
        case "uploading_prepare": message = "Preparing upload..."; break;
        case "uploading_to_firebase": message = "Saving to cloud..."; break;
        case "transcribing_chunk": message = "Transcribing..."; break; 
        case "analyzing": message = "Analyzing text..."; break;
        case "finalizing_transcription": message = "Finalizing transcript..."; break;
        case "google_upload_start": message = "Google API: Initiating upload..."; break;
        case "google_upload_finalize": message = "Google API: Uploading audio..."; break;
        case "google_gemini_generate": message = "Google API: Analyzing audio..."; break;
        default: message = "Processing..."; break;
    }
    loadingMessage.textContent = message;
    loadingOverlay.classList.add('visible');
}

function hideLoading() { 
    loadingOverlay.classList.remove('visible');
}

function applyTheme(theme) { 
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggleCheckbox.checked = true;
    } else {
        document.body.classList.remove('dark-theme');
        themeToggleCheckbox.checked = false;
    }
 }

// Theme Initialization
const savedTheme = localStorage.getItem('theme');
if (savedTheme) applyTheme(savedTheme);
else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) applyTheme('dark');
else applyTheme('light'); 

themeToggleCheckbox.addEventListener('change', function() {
    const theme = this.checked ? 'dark' : 'light';
    applyTheme(theme);
    localStorage.setItem('theme', theme);
});

function updateUIForRecordingState() { 
    startRecordBtn.disabled = recordingState !== 'idle';
    pauseRecordBtn.disabled = recordingState !== 'recording';
    resumeRecordBtn.disabled = recordingState !== 'paused';
    stopRecordBtn.disabled = recordingState === 'idle' || recordingState === 'requesting';
    
    uploadAudioBtn.disabled = recordingState !== 'idle';
    sttServiceSelect.disabled = recordingState !== 'idle';
    topicMedicalCheckbox.disabled = recordingState !== 'idle';
    topicGeneralCheckbox.disabled = recordingState !== 'idle';
    document.querySelectorAll('.btn-run-analysis').forEach(btn => {
        btn.disabled = recordingState !== 'idle' || transcriptOutputConvo.value.trim().length === 0;
    });

    [startRecordBtn, pauseRecordBtn, resumeRecordBtn, stopRecordBtn, uploadAudioBtn].forEach(btn => {
        btn.classList.toggle('disabled', btn.disabled);
    });
 }

function updateStatus(message, type = "info") { 
    statusDisplayText.textContent = message;
    statusDisplayText.className = 'status-display-text'; 
    if (type === "error") statusDisplayText.classList.add('error');
    if (type === "success") statusDisplayText.classList.add('success');
    
    if (type === "error") console.error(`UI Status (Error): ${message}`);
    else console.log(`UI Status: ${message} (Type: ${type})`);
}

function clearOutputFields() { 
    transcriptOutputConvo.value = "";
    transcriptOutputMultispeaker.value = "";
    detectedTopicsList.innerHTML = '<li>No topics detected yet.</li>';
    detectedTopicsList.classList.add('empty');
    document.querySelectorAll('.analysis-output').forEach(textarea => {
        textarea.value = '';
    });
    updateUIForRecordingState();
}

async function loadAndRenderRecordedAudio() {
  console.log("loadAndRenderRecordedAudio called");
  if (!db) {
    try {
      await initDB();
      if (!db) {
        console.error("DB not initialized for loading.");
        updateStatus("Error: DB not ready for loading audio.", "error");
        return;
      }
    } catch (e) {
      console.error("DB initialization failed during load attempt:", e);
      updateStatus("Error: DB not ready for loading audio.", "error");
      return;
    }
  }

  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.getAll();

  request.onsuccess = () => {
    const recordings = request.result;
    const recordedAudioList = document.getElementById('recordedAudioList');
    recordedAudioList.innerHTML = ''; // Clear existing list

    if (recordings.length === 0) {
      const emptyMessage = document.createElement('li');
      emptyMessage.className = 'empty-list-message';
      emptyMessage.textContent = 'No recordings yet.';
      recordedAudioList.appendChild(emptyMessage);
    } else {
      recordings.forEach(recording => {
        const listItem = document.createElement('li');
        listItem.className = 'recorded-audio-item';

        const audioLink = document.createElement('a');
        audioLink.href = URL.createObjectURL(recording.blob);
        audioLink.textContent = recording.name;
        audioLink.download = recording.name;

        listItem.appendChild(audioLink);
        recordedAudioList.appendChild(listItem);
      });
    }
  };

  request.onerror = event => {
    console.error("Error loading audio from IndexedDB:", event.target.error);
    updateStatus(`Error loading audio from local DB: ${event.target.error.message}`, "error");
  };
}


// Additional JavaScript functions (continued from extraction)

function resetToIdle(message = "Idle. Ready to record or upload.", type = "info") { 
    recordingState = 'idle';
    updateUIForRecordingState();
    updateStatus(message, type);

    fileNameDisplay.textContent = "No file selected.";
    if(audioFileUpload.value) audioFileUpload.value = ''; 
    allRecordedBlobs = []; 
    activeSpeechSegments = []; 
    vadIsSpeaking = false; 
    vadSpeechStartTime = 0;

    stopWaveformVisualization(); 
    stopVAD(); 
    waveformCanvas.style.display = 'none'; 

    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    mediaRecorder = null;
    hideLoading();

    startRecordBtn.textContent = "Start Recording";
    startRecordBtn.classList.remove('animating');
    pauseRecordBtn.textContent = "Pause";
    resumeRecordBtn.textContent = "Resume";
    stopRecordBtn.textContent = "Stop & Transcribe";
    stopRecordBtn.classList.remove('animating');
    uploadAudioBtn.textContent = "Upload Audio File";
    uploadAudioBtn.classList.remove('animating');

    updateUIForRecordingState(); 
}

function startWaveformVisualization(stream) { 
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    
    mediaStreamSourceForWaveform = audioContext.createMediaStreamSource(stream);
    analyserForWaveform = audioContext.createAnalyser();
    analyserForWaveform.fftSize = 2048; 
    const bufferLength = analyserForWaveform.frequencyBinCount;
    dataArrayForWaveform = new Uint8Array(bufferLength);
    
    waveformCanvas.style.display = 'block';
    
    waveformCanvas.width = waveformCanvas.offsetWidth;
    waveformCanvas.height = waveformCanvas.offsetHeight;

    mediaStreamSourceForWaveform.connect(analyserForWaveform);
    
    if (animationFrameId) { 
        cancelAnimationFrame(animationFrameId);
    }
    drawWaveform();
}

function drawWaveform() {
    if (!analyserForWaveform || !currentStream || !currentStream.active || recordingState === 'idle' || recordingState === 'stopped_for_processing' || !dataArrayForWaveform) {
        stopWaveformVisualization();
        return;
    }
    animationFrameId = requestAnimationFrame(drawWaveform);
    analyserForWaveform.getByteFrequencyData(dataArrayForWaveform);

    const centerX = waveformCanvas.width / 2;
    const centerY = waveformCanvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.8;

    waveformCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--output-bg').trim();
    waveformCtx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height);

    waveformCtx.lineWidth = 2;
    waveformCtx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim();

    waveformCtx.beginPath();
    for (let i = 0; i < dataArrayForWaveform.length; i++) {
        const angle = Math.PI * 2 * i / dataArrayForWaveform.length;
        const amplitude = (dataArrayForWaveform[i] / 256) * radius;
        const x = centerX + amplitude * Math.cos(angle);
        const y = centerY + amplitude * Math.sin(angle);

        if (i === 0) {
            waveformCtx.moveTo(x, y);
        } else {
            waveformCtx.lineTo(x, y);
        }
    }
    waveformCtx.closePath();
    waveformCtx.stroke();
}

function stopWaveformVisualization() { 
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    if (waveformCtx && waveformCanvas.width > 0 && waveformCanvas.height > 0) {
         waveformCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
    }
    if (mediaStreamSourceForWaveform) { try { mediaStreamSourceForWaveform.disconnect(); } catch(e) { console.warn("Error disconnecting mediaStreamSourceForWaveform:", e); } }
    if (analyserForWaveform) { try { analyserForWaveform.disconnect(); } catch(e) { console.warn("Error disconnecting analyserForWaveform:", e); } }
}

function startVAD(stream) { 
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();

    mediaStreamSourceForVAD = audioContext.createMediaStreamSource(stream);
    vadAnalyserNode = audioContext.createAnalyser();
    vadAnalyserNode.fftSize = 512; 
    vadAnalyserNode.smoothingTimeConstant = 0.5; 

    if (typeof audioContext.createScriptProcessor !== 'function') {
        console.warn("audioContext.createScriptProcessor is not available or is deprecated. VAD will not run. Consider AudioWorkletNode.");
        updateStatus("VAD (advanced) not fully available in this browser or is deprecated.", "info");
        return; 
    }

    const bufferSize = vadAnalyserNode.fftSize;
    vadProcessorNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
    const vadDataArray = new Uint8Array(vadAnalyserNode.frequencyBinCount);

    vadProcessorNode.onaudioprocess = function(audioProcessingEvent) {
        if (recordingState !== 'recording' || !vadProcessorNode) return; 

        vadAnalyserNode.getByteFrequencyData(vadDataArray); 

        let sum = 0;
        for (let i = 0; i < vadDataArray.length; i++) {
            sum += vadDataArray[i];
        }
        const averageEnergy = sum / vadDataArray.length / 255; 

        const currentTime = audioContext.currentTime; 

        if (averageEnergy > VAD_SILENCE_THRESHOLD) { 
            if (!vadIsSpeaking) { 
                vadIsSpeaking = true;
                vadSpeechStartTime = currentTime;
            }
        } else { 
            if (vadIsSpeaking) { 
                if ((currentTime - vadSpeechStartTime) * 1000 >= VAD_MIN_SPEECH_DURATION_MS) {
                    activeSpeechSegments.push({ start: vadSpeechStartTime, end: currentTime });
                    console.log(`VAD: Detected speech segment [${vadSpeechStartTime.toFixed(2)}s - ${currentTime.toFixed(2)}s]`);
                }
                vadIsSpeaking = false;
                vadSpeechStartTime = 0; 
            }
        }
    };

    mediaStreamSourceForVAD.connect(vadAnalyserNode);
    vadAnalyserNode.connect(vadProcessorNode);
    vadProcessorNode.connect(audioContext.destination); 
    console.log("VAD System Initialized & Started");
}

function stopVAD() { 
    if (vadIsSpeaking && vadSpeechStartTime > 0 && audioContext && audioContext.currentTime) { 
         const currentTime = audioContext.currentTime;
         if(currentTime > vadSpeechStartTime && (currentTime - vadSpeechStartTime) * 1000 >= VAD_MIN_SPEECH_DURATION_MS) {
            activeSpeechSegments.push({ start: vadSpeechStartTime, end: currentTime });
            console.log(`VAD: Final speech segment [${vadSpeechStartTime.toFixed(2)}s - ${currentTime.toFixed(2)}s] on stop.`);
         }
    }
    vadIsSpeaking = false;
    vadSpeechStartTime = 0;

    if (mediaStreamSourceForVAD) { try { mediaStreamSourceForVAD.disconnect(); } catch(e){ console.warn("Error disconnecting mediaStreamSourceForVAD on stop:", e); } }
    if (vadAnalyserNode) { try { vadAnalyserNode.disconnect(); } catch(e){ console.warn("Error disconnecting vadAnalyserNode on stop:", e); } }
    if (vadProcessorNode) { 
        try { vadProcessorNode.disconnect(); } catch(e){ console.warn("Error disconnecting vadProcessorNode on stop:", e); } 
        vadProcessorNode.onaudioprocess = null; 
    } 
    console.log("VAD System Stopped. All detected speech segments:", activeSpeechSegments);
}

function checkApiKeys() {
    const selectedService = sttServiceSelect.value;
    if (selectedService === 'openai_whisper' && (!OPENAI_API_KEY || OPENAI_API_KEY.includes("YOUR_"))) {
        updateStatus("OpenAI API Key not configured. Please edit the script with a valid key.", "error"); return false;
    }
    if (selectedService === 'google_gemini_audio' && (!GOOGLE_API_KEY || GOOGLE_API_KEY.includes("YOUR_"))) {
         updateStatus("Google Generative Language API Key not configured. Please edit the script with a valid key.", "error"); return false;
    }
    if (selectedService === 'emiliostt' && (!EMILIOSTT_API_KEY || EMILIOSTT_API_KEY.length < 10)) {
        updateStatus("EmilioStt API Key not configured. Please edit the script with a valid key.", "error"); return false;
    }
    return true;
}

// Event Listeners
startRecordBtn.addEventListener('click', async () => { 
    console.log("Start Recording button clicked");
    if (!checkApiKeys()) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { 
        updateStatus("Microphone access not supported by your browser.", "error"); return; 
    }
    
    clearOutputFields(); 
    activeSpeechSegments = []; 
    updateStatus("Requesting microphone access...", "info"); 
    showLoading("mic_request");
    recordingState = 'requesting'; 
    updateUIForRecordingState();
    startRecordBtn.textContent = "Requesting mic...";

    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        
        hideLoading(); 
        recordingState = 'recording'; 
        updateStatus("Recording...", "info"); 
        updateUIForRecordingState();
        startRecordBtn.textContent = "Recording..."; 
        startRecordBtn.classList.add('animating'); 

        startWaveformVisualization(currentStream); 
        startVAD(currentStream); 

        allRecordedBlobs = []; 
        let options = { mimeType: 'audio/webm;codecs=opus' }; 
        if (!MediaRecorder.isTypeSupported(options.mimeType)) { 
            options.mimeType = 'audio/webm';
            if (!MediaRecorder.isTypeSupported(options.mimeType)) options = {}; 
        }

        mediaRecorder = new MediaRecorder(currentStream, options);
        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) allRecordedBlobs.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            stopVAD(); 
            startRecordBtn.classList.remove('animating');
            stopRecordBtn.classList.remove('animating');

            if (recordingState !== 'stopped_for_processing') { 
                console.warn("MediaRecorder.onstop called unexpectedly. Assuming stop for processing.");
                recordingState = 'stopped_for_processing'; 
                updateStatus("Recording stopped. Processing audio...", "info");
                showLoading("finalizing_recording"); 
            }
            
            stopWaveformVisualization(); 
            waveformCanvas.style.display = 'none'; 

            if (allRecordedBlobs.length > 0) {
                const completeOriginalBlob = new Blob(allRecordedBlobs, { type: allRecordedBlobs[0].type || 'audio/webm' });
                allRecordedBlobs = []; 

                const timestamp = new Date().toISOString();
                const recordingNameBase = `recording-${timestamp.replace(/[:.]/g, '-')}`; 
                const localRecordingName = `${recordingNameBase}.webm`;
                const firebaseRecordingPath = `recorded_audio/${localRecordingName}`;

                await saveAudioToDB(completeOriginalBlob, localRecordingName); 
                try {
                    showLoading("uploading_to_firebase"); 
                    await uploadAudioToFirebase(completeOriginalBlob, firebaseRecordingPath); 
                } catch (fbError) {
                    console.warn("Firebase upload failed but continuing with transcription:", fbError);
                    updateStatus("Cloud save failed, proceeding locally.", "info");
                } finally {
                    hideLoading(); 
                }
                
                // Continue with transcription processing...
                console.log("Recording completed and saved. Ready for transcription.");
            }
        };

        mediaRecorder.start(MEDIA_RECORDER_TIMESLICE_MS);
        console.log("Recording started with MediaRecorder.");

    } catch (error) {
        console.error("Error accessing microphone:", error);
        updateStatus(`Microphone access denied or error: ${error.message}`, "error");
        resetToIdle("Microphone access failed. Please check permissions.", "error");
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
      }
    });
  }
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
  try {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('Service Worker registered with scope:', registration.scope);
    }).catch(error => {
      console.error('Service Worker registration failed:', error);
    });
  } catch (error) {
    console.error('Service Worker registration failed:', error);
  }
}

// Initialize UI on page load
updateUIForRecordingState();
updateStatus("Ready to record or upload audio files.", "info");
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import {GoogleGenAI} from '@google/genai';
import { initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore, doc, setDoc } from "firebase/firestore";
import { getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBe9a58zaQCrBSGeWwcIVa_PnZABoH6zV4",
  authDomain: "tudds-ccd0wn.firebaseapp.com",
  databaseURL: "https://tudds-ccd0wn-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tudds-ccd0wn",
  storageBucket: "tudds-ccd0wn.appspot.com",
  messagingSenderId: "786974954352",
  appId: "1:786974954352:web:b6772e7ea36ca5db9bb5b5",
  measurementId: "G-J51PBSD850"
};

const MODEL_NAME = 'gemini-2.5-flash-preview-04-17';

interface Note {
  id: string;
  rawTranscription: string;
  multiSpeakerTranscription: string;
  timestamp: number;
}

class VoiceNotesApp {
  private genAI: GoogleGenAI;
  private mediaRecorder: MediaRecorder | null = null;
  
  // Firebase
  private firebaseApp: FirebaseApp;
  private firestore: Firestore;
  private storage: FirebaseStorage;

  // New button elements
  private startButton: HTMLButtonElement;
  private pauseButton: HTMLButtonElement;
  private resumeButton: HTMLButtonElement;
  private stopButton: HTMLButtonElement;
  private uploadButtonLabel: HTMLButtonElement; 
  private audioFileInput: HTMLInputElement;
  private fileNameDisplay: HTMLSpanElement;
  private pauseResumeContainer: HTMLDivElement;
  private copyButton: HTMLButtonElement;
  private themeToggleButtonApp: HTMLButtonElement;

  private recordingStatus: HTMLDivElement;
  private rawTranscription: HTMLDivElement;
  private multiSpeakerNote: HTMLDivElement;
  private medTopicContentElement: HTMLDivElement; 
  
  // MedTopic Tab Elements
  private medTopicCheckbox: HTMLInputElement;
  private useUploadedTopicDataCheckbox: HTMLInputElement;
  private topicDataUploadButton: HTMLButtonElement;
  private topicDataUploadInput: HTMLInputElement;
  private topicFileNameDisplay: HTMLSpanElement;
  private medTopicTextInput: HTMLTextAreaElement;
  private uploadedTopicData: string | null = null;

  private audioChunks: Blob[] = [];
  private currentAudioBlob: Blob | null = null;
  private isRecording = false;
  private isPaused = false;
  private isProcessing = false; 
  private currentNote: Note | null = null;
  private stream: MediaStream | null = null;
  private editorTitle: HTMLDivElement;
  private currentFileName: string | null = null; // Name of the uploaded or recorded file

  private recordingInterface: HTMLDivElement;
  private liveRecordingTitle: HTMLDivElement;
  private liveWaveformCanvas: HTMLCanvasElement | null;
  private liveWaveformCtx: CanvasRenderingContext2D | null = null;
  private liveRecordingTimerDisplay: HTMLDivElement;
  private statusIndicatorDiv: HTMLDivElement | null;

  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private waveformDataArray: Uint8Array | null = null;
  private waveformDrawingId: number | null = null;
  private timerIntervalId: number | null = null;
  private recordingStartTime: number = 0;
  private pausedTime: number = 0; 

  constructor() {
    this.genAI = new GoogleGenAI({
      apiKey: process.env.API_KEY!,
    });

    // Initialize Firebase
    this.firebaseApp = initializeApp(firebaseConfig);
    this.firestore = getFirestore(this.firebaseApp);
    this.storage = getStorage(this.firebaseApp);

    // New button references
    this.startButton = document.getElementById('startButton') as HTMLButtonElement;
    this.pauseButton = document.getElementById('pauseButton') as HTMLButtonElement;
    this.resumeButton = document.getElementById('resumeButton') as HTMLButtonElement;
    this.stopButton = document.getElementById('stopButton') as HTMLButtonElement;
    this.uploadButtonLabel = document.getElementById('uploadButtonLabel') as HTMLButtonElement;
    this.audioFileInput = document.getElementById('audioFileInput') as HTMLInputElement;
    this.fileNameDisplay = document.getElementById('fileNameDisplay') as HTMLSpanElement;
    this.pauseResumeContainer = document.querySelector('.pause-resume-container') as HTMLDivElement;
    this.copyButton = document.getElementById('copyButton') as HTMLButtonElement;
    this.themeToggleButtonApp = document.getElementById('themeToggleButtonApp') as HTMLButtonElement;
    
    // Core UI elements
    this.recordingStatus = document.getElementById(
      'recordingStatus',
    ) as HTMLDivElement;
    this.rawTranscription = document.getElementById(
      'rawTranscription',
    ) as HTMLDivElement;
    this.multiSpeakerNote = document.getElementById(
      'multiSpeakerNote',
    ) as HTMLDivElement;
    this.medTopicContentElement = document.getElementById('medTopicContent') as HTMLDivElement;
    this.editorTitle = document.querySelector(
      '.editor-title',
    ) as HTMLDivElement;

    // MedTopic Tab Elements
    this.medTopicCheckbox = document.getElementById('medTopicCheckbox') as HTMLInputElement;
    this.useUploadedTopicDataCheckbox = document.getElementById('useUploadedTopicDataCheckbox') as HTMLInputElement;
    this.topicDataUploadButton = document.getElementById('topicDataUploadButton') as HTMLButtonElement;
    this.topicDataUploadInput = document.getElementById('topicDataUploadInput') as HTMLInputElement;
    this.topicFileNameDisplay = document.getElementById('topicFileNameDisplay') as HTMLSpanElement;
    this.medTopicTextInput = document.getElementById('medTopicTextInput') as HTMLTextAreaElement;
    
    this.recordingInterface = document.querySelector(
      '.recording-interface',
    ) as HTMLDivElement;
    this.liveRecordingTitle = document.getElementById(
      'liveRecordingTitle',
    ) as HTMLDivElement;
    this.liveWaveformCanvas = document.getElementById(
      'liveWaveformCanvas',
    ) as HTMLCanvasElement;
    this.liveRecordingTimerDisplay = document.getElementById(
      'liveRecordingTimerDisplay',
    ) as HTMLDivElement;

    if (this.liveWaveformCanvas) {
      this.liveWaveformCtx = this.liveWaveformCanvas.getContext('2d');
    }

    if (this.recordingInterface) {
      this.statusIndicatorDiv = this.recordingInterface.querySelector(
        '.status-indicator',
      ) as HTMLDivElement;
    }

    this.bindEventListeners();
    this.initTheme(); 
    this.performNewNoteReset(); 
    this.updateButtonVisibilityAndStates(); 
    this.recordingStatus.textContent = 'Ready';
  }

  private bindEventListeners(): void {
    this.startButton.addEventListener('click', () => this.handleStartRecording());
    this.pauseButton.addEventListener('click', () => this.handlePauseRecording());
    this.resumeButton.addEventListener('click', () => this.handleResumeRecording());
    this.stopButton.addEventListener('click', () => this.handleStopAndTranscribeRecording());
    
    this.uploadButtonLabel.addEventListener('click', () => this.audioFileInput.click());
    this.audioFileInput.addEventListener('change', (event) => this.handleFileUpload(event));

    this.copyButton.addEventListener('click', () => this.handleCopy());
    this.themeToggleButtonApp.addEventListener('click', () => this.toggleTheme());

    // MedTopic Listeners
    this.topicDataUploadButton.addEventListener('click', () => this.topicDataUploadInput.click());
    this.topicDataUploadInput.addEventListener('change', (event) => this.handleTopicFileUpload(event));
    
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private updateButtonVisibilityAndStates(): void {
    // Default: Not recording, not processing
    this.startButton.classList.remove('hidden');
    this.uploadButtonLabel.classList.remove('hidden');
    this.fileNameDisplay.classList.remove('hidden');

    this.pauseResumeContainer.classList.add('hidden');
    this.pauseButton.classList.add('hidden'); 
    this.resumeButton.classList.add('hidden'); 
    this.stopButton.classList.add('hidden');

    this.startButton.disabled = this.isProcessing;
    this.uploadButtonLabel.disabled = this.isProcessing;
    
    this.copyButton.disabled = false;
    this.themeToggleButtonApp.disabled = false;


    if (this.isProcessing) {
        this.startButton.classList.add('hidden');
        this.uploadButtonLabel.classList.add('hidden');
        this.pauseResumeContainer.classList.add('hidden');
        this.stopButton.classList.add('hidden');
    } else if (this.isRecording) {
        this.startButton.classList.add('hidden');
        this.uploadButtonLabel.classList.add('hidden'); 
        
        this.pauseResumeContainer.classList.remove('hidden');
        this.stopButton.classList.remove('hidden');
        this.stopButton.disabled = false;

        if (this.isPaused) {
            this.pauseButton.classList.add('hidden');
            this.resumeButton.classList.remove('hidden');
            this.resumeButton.disabled = false;
        } else {
            this.pauseButton.classList.remove('hidden');
            this.resumeButton.classList.add('hidden');
            this.pauseButton.disabled = false;
        }
    }
  }


  private prepareUIForNewContent(): void {
    if (this.editorTitle) {
        const placeholder = this.editorTitle.getAttribute('placeholder') || 'Untitled Note';
        this.editorTitle.textContent = placeholder;
        this.editorTitle.classList.add('placeholder-active');
        if ((this.editorTitle as any).refreshPlaceholder) (this.editorTitle as any).refreshPlaceholder();
    }

    const rawPlaceholder = this.rawTranscription.getAttribute('placeholder') || '';
    this.rawTranscription.textContent = rawPlaceholder;
    this.rawTranscription.classList.add('placeholder-active');
    if ((this.rawTranscription as any).refreshPlaceholder) (this.rawTranscription as any).refreshPlaceholder();


    const multiSpeakerPlaceholder = this.multiSpeakerNote.getAttribute('placeholder') || '';
    this.multiSpeakerNote.textContent = multiSpeakerPlaceholder;
    this.multiSpeakerNote.classList.add('placeholder-active');
    if ((this.multiSpeakerNote as any).refreshPlaceholder) (this.multiSpeakerNote as any).refreshPlaceholder();

    this.medTopicCheckbox.checked = false;
    this.useUploadedTopicDataCheckbox.checked = false;
    this.medTopicTextInput.value = '';
    this.uploadedTopicData = null;
    this.topicFileNameDisplay.textContent = 'No topic file selected.';
    this.topicDataUploadInput.value = ''; 


    this.currentFileName = null;
    this.fileNameDisplay.textContent = 'No file selected.';
    this.currentAudioBlob = null;

    if (this.currentNote) {
        this.currentNote.rawTranscription = '';
        this.currentNote.multiSpeakerTranscription = '';
    }
  }

  private async handleFileUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
        this.recordingStatus.textContent = 'No file selected.';
        this.fileNameDisplay.textContent = 'No file selected.';
        this.currentFileName = null;
        this.currentAudioBlob = null;
        input.value = ''; 
        return;
    }
    const file = input.files[0];
    this.currentFileName = file.name;
    this.fileNameDisplay.textContent = file.name;
    this.currentAudioBlob = new Blob([file], { type: file.type });


    if (this.isRecording) { 
        await this.handleStopAndTranscribeRecording(false); 
    }

    this.prepareUIForNewContent(); 
    this.fileNameDisplay.textContent = file.name; // Restore filename after prepareUI call
    this.currentAudioBlob = new Blob([file], { type: file.type }); // Restore blob

    this.isProcessing = true;
    this.updateButtonVisibilityAndStates();
    this.recordingStatus.textContent = 'Processing uploaded file...';

    try {
        if (this.currentAudioBlob) {
            await this.processAudio(this.currentAudioBlob, file.type || 'audio/webm'); 
        } else {
            throw new Error("Audio blob not available for processing.");
        }
    } catch (e) {
        console.error("Error during file upload processing chain:", e);
        this.recordingStatus.textContent = `Failed to process: ${this.currentFileName}`;
        this.isProcessing = false; // Ensure reset on error
    } finally {
        // isProcessing is typically set to false in getMultiSpeakerTranscription or its error handlers
        this.updateButtonVisibilityAndStates();
        input.value = ''; 
    }
  }

  private async handleTopicFileUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.uploadedTopicData = null;
      this.topicFileNameDisplay.textContent = 'No topic file selected.';
      input.value = '';
      return;
    }
    const file = input.files[0];
    this.topicFileNameDisplay.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.uploadedTopicData = e.target?.result as string;
      this.recordingStatus.textContent = `Topic file "${file.name}" loaded.`;
    };
    reader.onerror = () => {
      this.uploadedTopicData = null;
      this.topicFileNameDisplay.textContent = 'Error loading topic file.';
      this.recordingStatus.textContent = 'Failed to load topic file.';
    };
    reader.readAsText(file);
    input.value = ''; 
  }


  private handleResize(): void {
    if (
      this.isRecording && 
      this.liveWaveformCanvas &&
      this.liveWaveformCanvas.style.display === 'block'
    ) {
      requestAnimationFrame(() => {
        this.setupCanvasDimensions();
      });
    }
  }

  private setupCanvasDimensions(): void {
    if (!this.liveWaveformCanvas || !this.liveWaveformCtx) return;
    const canvas = this.liveWaveformCanvas;
    const dpr = window.devicePixelRatio || 1;

    const rect = canvas.getBoundingClientRect();
    const cssWidth = rect.width;
    const cssHeight = rect.height;

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    this.liveWaveformCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private initTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light'); 
    }
  }

  private toggleTheme(): void { 
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
  }

  private async handleCopy(): Promise<void> {
    let textToCopy = '';
    const activeMultiSpeaker = this.multiSpeakerNote.classList.contains('active');
    const activeRaw = this.rawTranscription.classList.contains('active');

    if (activeMultiSpeaker && this.multiSpeakerNote.textContent && !this.multiSpeakerNote.classList.contains('placeholder-active')) {
        textToCopy = this.multiSpeakerNote.textContent;
    } else if (activeRaw && this.rawTranscription.textContent && !this.rawTranscription.classList.contains('placeholder-active')) {
        textToCopy = this.rawTranscription.textContent;
    }

    if (textToCopy) {
        try {
            await navigator.clipboard.writeText(textToCopy);
            this.recordingStatus.textContent = 'Copied to clipboard!';
        } catch (err) {
            console.error('Failed to copy text: ', err);
            this.recordingStatus.textContent = 'Copy failed.';
        }
    } else {
        this.recordingStatus.textContent = 'Nothing to copy.';
    }
    setTimeout(() => {
        if (this.recordingStatus.textContent === 'Copied to clipboard!' || this.recordingStatus.textContent === 'Copy failed.' || this.recordingStatus.textContent === 'Nothing to copy.') {
            this.recordingStatus.textContent = this.isProcessing ? 'Processing...' : (this.isRecording ? (this.isPaused ? 'Paused' : 'Recording...') : 'Ready');
        }
    }, 2000);
  }

  private getMedTopicContext(): string | null {
    if (!this.medTopicCheckbox.checked) {
      return null;
    }

    let contextParts: string[] = [];
    const textInputValue = this.medTopicTextInput.value.trim();
    
    if (textInputValue) {
      contextParts.push("From user text input:\n" + textInputValue);
    }

    if (this.useUploadedTopicDataCheckbox.checked && this.uploadedTopicData) {
      contextParts.push("From uploaded topic file:\n" + this.uploadedTopicData);
    }

    if (contextParts.length > 0) {
      return "The following medical topics and terms should be prioritized for accuracy during transcription. If relevant to the audio, ensure these are transcribed correctly:\n\n" + contextParts.join("\n\n---\n\n");
    }
    
    return "Medical term focus is enabled. Please pay special attention to medical terminology."; 
  }


  private async handleStartRecording(): Promise<void> {
    if (this.isProcessing || this.isRecording) return; 

    this.performNewNoteReset(); 
    this.currentFileName = `recording-${Date.now()}.webm`; // Default filename for recordings

    try {
      this.audioChunks = [];
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
        this.audioContext = null;
      }

      this.recordingStatus.textContent = 'Mic access...';

      try {
        this.stream = await navigator.mediaDevices.getUserMedia({audio: true});
      } catch (err) {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: { /* fallback constraints */ },
        });
      }
       try {
          this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'audio/webm' });
        } catch (e) {
          try {
            this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'audio/ogg;codecs=opus' });
          } catch (e2) {
            this.mediaRecorder = new MediaRecorder(this.stream);
          }
        }

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0)
          this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = async () => {
        this.stopLiveDisplay();
        this.isProcessing = true;
        this.isRecording = false; 
        this.isPaused = false;
        this.updateButtonVisibilityAndStates(); 

        try {
            if (this.audioChunks.length > 0) {
                this.currentAudioBlob = new Blob(this.audioChunks, {
                    type: this.mediaRecorder?.mimeType || 'audio/webm',
                });
                if (!this.currentFileName && this.currentAudioBlob) {
                     this.currentFileName = `recording-${Date.now()}.${this.currentAudioBlob.type.split('/')[1] || 'webm'}`;
                }
                await this.processAudio(this.currentAudioBlob, this.mediaRecorder?.mimeType || 'audio/webm');
            } else {
                this.recordingStatus.textContent = 'No audio captured.';
                 this.isProcessing = false; 
            }
        } catch (err) {
            console.error('Error processing recorded audio in onstop:', err);
            this.recordingStatus.textContent = 'Error processing.';
             this.isProcessing = false; 
        } finally {
            // isProcessing is managed by getMultiSpeakerTranscription or its error handlers
            this.updateButtonVisibilityAndStates(); 
            if (this.stream) { 
                this.stream.getTracks().forEach((track) => track.stop());
                this.stream = null;
            }
            this.audioChunks = []; 
        }
      };
      
      this.mediaRecorder.onpause = () => {
        if (!this.isPaused) { 
            this.isPaused = true;
            this.pausedTime += Date.now() - this.recordingStartTime; 
            if (this.timerIntervalId) clearInterval(this.timerIntervalId);
            this.stopLiveWaveform(); 
            this.recordingStatus.textContent = 'Paused';
            this.updateButtonVisibilityAndStates();
        }
      };

      this.mediaRecorder.onresume = () => {
        if(this.isPaused){ 
            this.isPaused = false;
            this.recordingStartTime = Date.now(); 
            this.startLiveWaveform();
            if (this.timerIntervalId) clearInterval(this.timerIntervalId);
            this.timerIntervalId = window.setInterval(() => this.updateLiveTimer(), 50);
            this.recordingStatus.textContent = 'Recording...';
            this.updateButtonVisibilityAndStates();
        }
      };


      this.mediaRecorder.start();
      this.isRecording = true;
      this.isPaused = false;
      this.isProcessing = false; 
      this.pausedTime = 0; 
      this.recordingStartTime = Date.now(); 

      this.updateButtonVisibilityAndStates();
      this.recordingStatus.textContent = 'Recording...';
      this.startLiveDisplay();

    } catch (error) {
      console.error('Error starting recording:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.recordingStatus.textContent = `Rec Err: ${errorMessage.substring(0,30)}`;
      this.isRecording = false;
      this.isPaused = false;
      this.isProcessing = false; 
      this.updateButtonVisibilityAndStates();
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
      this.stopLiveDisplay();
    }
  }

  private handlePauseRecording(): void {
    if (this.mediaRecorder && this.isRecording && !this.isPaused && this.mediaRecorder.state === "recording") {
        this.mediaRecorder.pause();
    }
  }

  private handleResumeRecording(): void {
    if (this.mediaRecorder && this.isRecording && this.isPaused && this.mediaRecorder.state === "paused") {
        this.mediaRecorder.resume();
    }
  }
  
  private async handleStopAndTranscribeRecording(doTranscribe: boolean = true): Promise<void> {
    if (this.mediaRecorder && (this.isRecording || this.isPaused)) {
        if (this.mediaRecorder.state === "recording" || this.mediaRecorder.state === "paused") {
            this.mediaRecorder.stop(); 
        }
        this.recordingStatus.textContent = doTranscribe ? 'Finalizing audio...' : 'Stopping...';
    } else {
        this.isRecording = false;
        this.isPaused = false;
        this.stopLiveDisplay();
        this.updateButtonVisibilityAndStates();
    }
  }


  private setupAudioVisualizer(): void {
    if (!this.stream || this.audioContext) return; 

    this.audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyserNode = this.audioContext.createAnalyser();

    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.75;

    const bufferLength = this.analyserNode.frequencyBinCount;
    this.waveformDataArray = new Uint8Array(bufferLength);

    source.connect(this.analyserNode);
  }

  private drawLiveWaveform(): void {
     if (
      !this.analyserNode ||
      !this.waveformDataArray ||
      !this.liveWaveformCtx ||
      !this.liveWaveformCanvas ||
      !this.isRecording || 
      this.isPaused 
    ) {
      if (this.waveformDrawingId) cancelAnimationFrame(this.waveformDrawingId);
      this.waveformDrawingId = null;
      return;
    }

    this.waveformDrawingId = requestAnimationFrame(() =>
      this.drawLiveWaveform(),
    );
    this.analyserNode.getByteFrequencyData(this.waveformDataArray);

    const ctx = this.liveWaveformCtx;
    const canvas = this.liveWaveformCanvas;

    const logicalWidth = canvas.clientWidth;
    const logicalHeight = canvas.clientHeight;

    ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    const bufferLength = this.analyserNode.frequencyBinCount;
    const numBars = Math.floor(bufferLength * 0.5);
    if (numBars === 0) return;

    const totalBarPlusSpacingWidth = logicalWidth / numBars;
    const barWidth = Math.max(1, Math.floor(totalBarPlusSpacingWidth * 0.7));
    const barSpacing = Math.max(0, Math.floor(totalBarPlusSpacingWidth * 0.3));
    let x = 0;
    const recordingColor = getComputedStyle(document.documentElement).getPropertyValue('--color-recording').trim() || '#ff3b30';
    ctx.fillStyle = recordingColor;

    for (let i = 0; i < numBars; i++) {
      if (x >= logicalWidth) break;
      const dataIndex = Math.floor(i * (bufferLength / numBars));
      const barHeightNormalized = this.waveformDataArray[dataIndex] / 255.0;
      let barHeight = barHeightNormalized * logicalHeight;
      if (barHeight < 1 && barHeight > 0) barHeight = 1;
      barHeight = Math.round(barHeight);
      const y = Math.round((logicalHeight - barHeight) / 2);
      ctx.fillRect(Math.floor(x), y, barWidth, barHeight);
      x += barWidth + barSpacing;
    }
  }

  private updateLiveTimer(): void {
    if (!this.isRecording || this.isPaused || !this.liveRecordingTimerDisplay) return;
    const now = Date.now();
    const elapsedMs = this.pausedTime + (now - this.recordingStartTime); 

    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor((elapsedMs % 1000) / 10);

    this.liveRecordingTimerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
  }

  private startLiveDisplay(): void {
     if (!this.recordingInterface || !this.liveRecordingTitle || !this.liveWaveformCanvas || !this.liveRecordingTimerDisplay) return;

    this.recordingInterface.classList.add('is-live');
    this.liveRecordingTitle.style.display = 'block';
    this.liveWaveformCanvas.style.display = 'block';
    this.liveRecordingTimerDisplay.style.display = 'block';
    this.setupCanvasDimensions();
    if (this.statusIndicatorDiv) this.statusIndicatorDiv.style.display = 'block'; 

    const currentTitle = this.editorTitle.textContent?.trim();
    const placeholder = this.editorTitle.getAttribute('placeholder') || 'Untitled Note';
    this.liveRecordingTitle.textContent = currentTitle && currentTitle !== placeholder && !this.editorTitle.classList.contains('placeholder-active') ? currentTitle : 'New Recording';
    
    this.setupAudioVisualizer(); 
    this.startLiveWaveform(); 
    
    this.updateLiveTimer(); 
    if (this.timerIntervalId) clearInterval(this.timerIntervalId);
    this.timerIntervalId = window.setInterval(() => this.updateLiveTimer(), 50);
  }

  private startLiveWaveform(): void {
    if (this.waveformDrawingId) cancelAnimationFrame(this.waveformDrawingId);
    this.drawLiveWaveform();
  }
  private stopLiveWaveform(): void {
    if (this.waveformDrawingId) {
      cancelAnimationFrame(this.waveformDrawingId);
      this.waveformDrawingId = null;
    }
  }

  private stopLiveDisplay(): void {
    if (!this.recordingInterface) return;
    this.recordingInterface.classList.remove('is-live');
    if(this.liveRecordingTitle) this.liveRecordingTitle.style.display = 'none';
    if(this.liveWaveformCanvas) this.liveWaveformCanvas.style.display = 'none';
    if(this.liveRecordingTimerDisplay) this.liveRecordingTimerDisplay.style.display = 'none';
    
    this.stopLiveWaveform();

    if (this.timerIntervalId) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
    if (this.liveWaveformCtx && this.liveWaveformCanvas) {
      this.liveWaveformCtx.clearRect(0,0,this.liveWaveformCanvas.width,this.liveWaveformCanvas.height);
    }

    if (this.audioContext) {
      if (this.audioContext.state !== 'closed') {
        this.audioContext.close().catch((e) => console.warn('Error closing audio context', e));
      }
      this.audioContext = null; 
    }
    this.analyserNode = null;
    this.waveformDataArray = null;
  }

  private async processAudio(audioBlob: Blob, mimeType: string): Promise<void> {
    if (audioBlob.size === 0) {
      this.recordingStatus.textContent = 'Audio data empty.';
      this.isProcessing = false;
      this.updateButtonVisibilityAndStates();
      return;
    }
    this.currentAudioBlob = audioBlob; // Ensure currentAudioBlob is set

    try {
      this.recordingStatus.textContent = this.currentFileName ? `Converting: ${this.currentFileName.substring(0,15)}...` : 'Converting audio...';

      const reader = new FileReader();
      const readResult = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          try {
            const base64data = reader.result as string;
            if (!base64data) { reject(new Error('FileReader no data.')); return; }
            const base64Audio = base64data.split(',')[1];
            if (!base64Audio) { reject(new Error('Bad base64 data.')); return; }
            resolve(base64Audio);
          } catch (err) { reject(err); }
        };
        reader.onerror = () => reject(reader.error || new Error('FileReader error'));
        reader.onabort = () => reject(new Error('File reading aborted.'));
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await readResult;

      await this.getTranscription(base64Audio, mimeType);
    } catch (error) {
      console.error('Error in processAudio:', error);
      this.recordingStatus.textContent = `Proc. Error: ${error instanceof Error ? error.message.substring(0,20) : String(error).substring(0,20)}`;
      this.isProcessing = false; 
      this.updateButtonVisibilityAndStates();
    }
  }

  private async getTranscription(
    base64Audio: string,
    mimeType: string,
  ): Promise<void> {
    try {
      this.recordingStatus.textContent = this.currentFileName ? `Transcribing: ${this.currentFileName.substring(0,10)}...` : 'Transcribing...';
      
      const medContext = this.getMedTopicContext();
      let mainPrompt = 'Generate a complete, detailed transcript of this audio.';
      if (medContext) {
          mainPrompt = `${medContext}\n\nBased on the topics and terms provided above, please generate a complete, detailed transcript of the following audio, paying special attention to correctly transcribing any relevant medical terminology.`;
      }

      const contents = [
        {text: mainPrompt},
        {inlineData: {mimeType: mimeType, data: base64Audio}},
      ];

      const response = await this.genAI.models.generateContent({
        model: MODEL_NAME,
        contents: contents,
      });
      const transcriptionText = response.text;

      if (transcriptionText) {
        this.rawTranscription.textContent = transcriptionText;
        if (transcriptionText.trim() !== '') this.rawTranscription.classList.remove('placeholder-active');
        else {
          this.rawTranscription.textContent = this.rawTranscription.getAttribute('placeholder') || '';
          this.rawTranscription.classList.add('placeholder-active');
        }
        if((this.rawTranscription as any).refreshPlaceholder) (this.rawTranscription as any).refreshPlaceholder();
        if (this.currentNote) this.currentNote.rawTranscription = transcriptionText;
        await this.getMultiSpeakerTranscription(); 
      } else {
        this.recordingStatus.textContent = 'Transcription empty.';
        this.multiSpeakerNote.textContent = 'Could not transcribe.';
        this.multiSpeakerNote.classList.remove('placeholder-active');
        if((this.multiSpeakerNote as any).refreshPlaceholder) (this.multiSpeakerNote as any).refreshPlaceholder();
        this.rawTranscription.textContent = this.rawTranscription.getAttribute('placeholder');
        this.rawTranscription.classList.add('placeholder-active');
        if((this.rawTranscription as any).refreshPlaceholder) (this.rawTranscription as any).refreshPlaceholder();
        this.isProcessing = false;
        this.updateButtonVisibilityAndStates();
      }
    } catch (error) {
      console.error('Error getting transcription:', error);
      this.recordingStatus.textContent = `Transcribe Err: ${error instanceof Error ? error.message.substring(0,20) : String(error).substring(0,20)}`;
      this.multiSpeakerNote.textContent = `Transcription Error.`;
      if((this.multiSpeakerNote as any).refreshPlaceholder) (this.multiSpeakerNote as any).refreshPlaceholder();
      this.rawTranscription.textContent = this.rawTranscription.getAttribute('placeholder');
      this.rawTranscription.classList.add('placeholder-active');
      if((this.rawTranscription as any).refreshPlaceholder) (this.rawTranscription as any).refreshPlaceholder();
      this.isProcessing = false;
      this.updateButtonVisibilityAndStates();
    }
  }

  private async getMultiSpeakerTranscription(): Promise<void> {
    try {
      if (!this.rawTranscription.textContent || this.rawTranscription.textContent.trim() === '' || this.rawTranscription.classList.contains('placeholder-active')) {
        this.recordingStatus.textContent = 'No raw text for multi-speaker.';
        const placeholder = this.multiSpeakerNote.getAttribute('placeholder') || '';
        this.multiSpeakerNote.textContent = placeholder;
        this.multiSpeakerNote.classList.add('placeholder-active');
        if((this.multiSpeakerNote as any).refreshPlaceholder) (this.multiSpeakerNote as any).refreshPlaceholder();
        this.isProcessing = false;
        this.updateButtonVisibilityAndStates();
        return;
      }

      this.recordingStatus.textContent = 'Diarizing...';
      
      const medContext = this.getMedTopicContext();
      let basePrompt = `You are a helpful assistant that performs speaker diarization on a raw audio transcript.
Your task is to identify distinct speakers and reformat the transcript to clearly attribute dialogue to each speaker.
Label each speaker sequentially as "Speaker 1", "Speaker 2", "Speaker 3", and so on.
Do NOT add any introductory text, concluding text, summaries, analyses, or any other content beyond the diarized transcript itself.
Only output the formatted transcript with speaker labels.`;

      if (medContext) {
          basePrompt = `${medContext}\n\n${basePrompt}\nWhen performing speaker diarization, ensure any medical terms mentioned, especially those related to the topics above, are accurately transcribed within the speaker dialogue.`;
      }
      
      const fullPrompt = `${basePrompt}\n\nRaw transcription:\n${this.rawTranscription.textContent}`;
      const contents = [{text: fullPrompt}];

      const response = await this.genAI.models.generateContent({model: MODEL_NAME, contents: contents});
      const multiSpeakerText = response.text;

      if (multiSpeakerText) {
        this.multiSpeakerNote.textContent = multiSpeakerText;
        if (multiSpeakerText.trim() !== '') this.multiSpeakerNote.classList.remove('placeholder-active');
        else {
          this.multiSpeakerNote.textContent = this.multiSpeakerNote.getAttribute('placeholder') || '';
          this.multiSpeakerNote.classList.add('placeholder-active');
        }
        if((this.multiSpeakerNote as any).refreshPlaceholder) (this.multiSpeakerNote as any).refreshPlaceholder();

        let noteTitleSet = false;
        const lines = multiSpeakerText.split('\n').map((l) => l.trim());
        if (this.editorTitle) {
            for (const line of lines) {
                const cleanedLine = line.replace(/^Speaker\s\d+:\s*/i, '').trim();
                if (cleanedLine.length > 0) {
                  let potentialTitle = cleanedLine.replace(/^[\*_\`#\->\s\[\]\(.\d)]+/, '');
                  potentialTitle = potentialTitle.replace(/[\*_\`#]+$/, '');
                  potentialTitle = potentialTitle.trim();
                  if (potentialTitle.length > 3) {
                    const maxLength = 60;
                    this.editorTitle.textContent = potentialTitle.substring(0, maxLength) + (potentialTitle.length > maxLength ? '...' : '');
                    this.editorTitle.classList.remove('placeholder-active');
                    if((this.editorTitle as any).refreshPlaceholder) (this.editorTitle as any).refreshPlaceholder();
                    noteTitleSet = true;
                    break;
                  }
                }
            }
        }
        if (!noteTitleSet && this.editorTitle) {
          const currentEditorText = this.editorTitle.textContent?.trim();
          const placeholderText = this.editorTitle.getAttribute('placeholder') || 'Untitled Note';
          if (currentEditorText === '' || currentEditorText === placeholderText || this.editorTitle.classList.contains('placeholder-active') ) {
            this.editorTitle.textContent = placeholderText;
            this.editorTitle.classList.add('placeholder-active');
          }
           if((this.editorTitle as any).refreshPlaceholder) (this.editorTitle as any).refreshPlaceholder();
        }

        if (this.currentNote) this.currentNote.multiSpeakerTranscription = multiSpeakerText;
        this.recordingStatus.textContent = this.currentFileName ? `${this.currentFileName.substring(0,10)}: Done.` : 'Transcription complete.';
      } else {
        this.recordingStatus.textContent = 'Diarization empty.';
        this.multiSpeakerNote.textContent = 'Multi-speaker empty.';
        this.multiSpeakerNote.classList.add('placeholder-active'); 
        if((this.multiSpeakerNote as any).refreshPlaceholder) (this.multiSpeakerNote as any).refreshPlaceholder();
      }
    } catch (error) {
      console.error('Error processing multi-speaker output:', error);
      this.recordingStatus.textContent = `Diarize Err: ${error instanceof Error ? error.message.substring(0,20) : String(error).substring(0,20)}`;
      this.multiSpeakerNote.textContent = `Multi-speaker Error.`;
      this.multiSpeakerNote.classList.add('placeholder-active');
      if((this.multiSpeakerNote as any).refreshPlaceholder) (this.multiSpeakerNote as any).refreshPlaceholder();
    } finally {
        this.isProcessing = false;
        this.updateButtonVisibilityAndStates();
        // Save after all processing is done
        if (this.currentNote && this.currentAudioBlob && 
            (this.currentNote.rawTranscription.trim() !== '' || this.currentNote.multiSpeakerTranscription.trim() !== '')) {
             this.saveCurrentNoteData().catch(e => console.error("Error saving note to Firebase:", e));
        }
    }
  }

  private async saveCurrentNoteData(): Promise<void> {
    if (!this.currentNote || !this.currentAudioBlob) {
      console.warn("Save attempted but currentNote or currentAudioBlob is missing.");
      this.recordingStatus.textContent = "Error: Note data incomplete for save.";
      return;
    }

    const originalStatus = this.recordingStatus.textContent;
    this.recordingStatus.textContent = "Saving note...";

    try {
      const audioFileName = this.currentFileName || `audio_${this.currentNote.id}.${this.currentAudioBlob.type.split('/')[1] || 'webm'}`;
      const storagePath = `audiofiles/${this.currentNote.id}/${audioFileName}`;
      const audioStorageRef = ref(this.storage, storagePath);

      const uploadResult = await uploadBytes(audioStorageRef, this.currentAudioBlob);
      const audioUrl = await getDownloadURL(uploadResult.ref);

      const noteData = {
        id: this.currentNote.id,
        title: this.editorTitle.textContent?.trim() === this.editorTitle.getAttribute('placeholder')?.trim() ? 'Untitled Note' : this.editorTitle.textContent?.trim() || 'Untitled Note',
        rawTranscription: this.currentNote.rawTranscription,
        multiSpeakerTranscription: this.currentNote.multiSpeakerTranscription,
        timestamp: this.currentNote.timestamp,
        audioUrl: audioUrl,
        audioFileName: audioFileName,
        medTopicEnabled: this.medTopicCheckbox.checked,
        medTopicContextUsed: this.getMedTopicContext(),
        medTopicUploadedFileName: this.useUploadedTopicDataCheckbox.checked ? this.topicFileNameDisplay.textContent : null,
        medTopicTextInputContent: this.medTopicCheckbox.checked ? this.medTopicTextInput.value.trim() : null,
      };

      const noteDocRef = doc(this.firestore, "notes", this.currentNote.id);
      await setDoc(noteDocRef, noteData);

      this.recordingStatus.textContent = "Note saved!";
    } catch (error) {
      console.error("Error saving note to Firebase:", error);
      this.recordingStatus.textContent = "Save failed. Check console.";
    } finally {
        setTimeout(() => {
            if (this.recordingStatus.textContent === 'Note saved!' || this.recordingStatus.textContent === 'Save failed. Check console.') {
                 this.recordingStatus.textContent = originalStatus?.includes("Done") || originalStatus?.includes("complete") ? originalStatus : "Ready";
            }
        }, 3000);
    }
  }
  
  private performNewNoteReset(): void {
    this.currentNote = {
      id: `note_${Date.now()}`,
      rawTranscription: '',
      multiSpeakerTranscription: '',
      timestamp: Date.now(),
    };
    this.currentAudioBlob = null;
    this.currentFileName = null;
    this.prepareUIForNewContent(); 
    this.recordingStatus.textContent = 'Ready';
    this.isRecording = false; 
    this.isPaused = false;
    this.isProcessing = false; 
    this.stopLiveDisplay(); 
    this.updateButtonVisibilityAndStates();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new VoiceNotesApp();
});

export {};

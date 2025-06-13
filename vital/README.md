# Vital IT - Advanced Transcription PWA

A Progressive Web App (PWA) for advanced audio transcription with real-time recording, multiple STT services, and AI-powered analysis.

## Features

- **Progressive Web App**: Installable on desktop and mobile devices
- **Offline Functionality**: Works offline with service worker caching
- **Real-time Audio Recording**: Live waveform visualization and voice activity detection
- **Multiple STT Services**: Support for OpenAI Whisper, Google Gemini, and EmilioStt
- **Multi-speaker Support**: Speaker separation and identification
- **Topic Detection**: Keyword-based topic analysis
- **AI Analysis**: 10 different transcript analyzers for comprehensive insights
- **Dark/Light Theme**: Toggle between themes with system preference detection
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## PWA Components

### Directory Structure
```
vital-it-transcription-pwa/
├── index.html              # Main HTML file with PWA meta tags
├── manifest.json           # PWA manifest file
├── sw.js                   # Service worker for offline functionality
├── browserconfig.xml       # Microsoft PWA configuration
├── css/
│   └── styles.css          # Main stylesheet
├── js/
│   └── app.js              # Main JavaScript application
└── assets/
    ├── icons/              # PWA icons (72x72 to 512x512)
    │   ├── icon-72x72.png
    │   ├── icon-96x96.png
    │   ├── icon-128x128.png
    │   ├── icon-144x144.png
    │   ├── icon-152x152.png
    │   ├── icon-192x192.png
    │   ├── icon-384x384.png
    │   └── icon-512x512.png
    └── images/             # Additional assets
```

### PWA Features Implemented

1. **Web App Manifest** (`manifest.json`)
   - App name, description, and branding
   - Icon definitions for all required sizes
   - Display mode set to "standalone"
   - Theme colors and background colors
   - Shortcuts for quick actions
   - Screenshots for app stores

2. **Service Worker** (`sw.js`)
   - Offline caching strategy
   - Static asset caching
   - Dynamic content caching
   - Background sync support
   - Push notification handling
   - Cache versioning and cleanup

3. **PWA Meta Tags**
   - Apple mobile web app support
   - Microsoft tile configuration
   - Theme color definitions
   - Viewport optimization

4. **Icons**
   - Complete icon set from 72x72 to 512x512 pixels
   - Maskable icons for adaptive icon support
   - Consistent branding with app colors

## Installation

### Local Development
1. Clone or download the PWA directory
2. Serve the files using a local web server (required for PWA features)
3. Open in a modern web browser
4. The browser will prompt to install the PWA

### Web Server Setup
```bash
# Using Python's built-in server
cd vital-it-transcription-pwa
python3 -m http.server 8000

# Using Node.js serve
npx serve .

# Using PHP's built-in server
php -S localhost:8000
```

### PWA Installation
- **Desktop**: Click the install button in the browser address bar
- **Mobile**: Use "Add to Home Screen" from the browser menu
- **Chrome**: Look for the install prompt or use the menu option

## Configuration

### API Keys
Update the following API keys in `js/app.js`:
- `OPENAI_API_KEY`: OpenAI API key for Whisper transcription
- `GOOGLE_API_KEY`: Google API key for Gemini audio analysis
- `EMILIOSTT_API_KEY`: EmilioStt API key for multi-speaker transcription

### Firebase Configuration
Update the Firebase configuration in `js/app.js` with your project details:
```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  // ... other config
};
```

## Usage

1. **Recording Audio**
   - Click "Start Recording" to begin audio capture
   - Use pause/resume controls as needed
   - Click "Stop & Transcribe" to process the audio

2. **Uploading Files**
   - Click "Upload Audio File" to select a file
   - Supported formats: MP3, MP4, WAV, OGG, WebM

3. **Transcription Services**
   - Select your preferred STT service from the dropdown
   - Each service provides different features:
     - OpenAI Whisper: High accuracy with timestamps
     - Google Gemini: Audio description and analysis
     - EmilioStt: Multi-speaker identification

4. **Analysis**
   - Use the 10 built-in analyzers for transcript insights
   - Topics are detected based on keyword matching
   - Results include summaries, action items, sentiment analysis, and more

## Browser Support

- Chrome 67+ (recommended)
- Firefox 60+
- Safari 11.1+
- Edge 79+

## Offline Functionality

The PWA works offline with cached resources:
- Static assets (HTML, CSS, JS, icons)
- External libraries (Firebase)
- Previously loaded content
- Graceful degradation for API calls

## Security Notes

- API keys are stored in client-side code (development setup)
- For production, implement server-side API proxy
- HTTPS required for PWA features in production
- Consider implementing authentication for sensitive data

## Development

### Adding New Features
1. Update the service worker cache version when making changes
2. Test PWA functionality using browser developer tools
3. Validate manifest.json using online validators
4. Test installation and offline functionality

### Debugging
- Use Chrome DevTools > Application tab for PWA debugging
- Check service worker status and cache contents
- Validate manifest.json and icon loading
- Test offline functionality by disabling network

## License

For local testing and demonstration purposes.

## Support

This PWA provides a complete transcription solution with modern web technologies and offline capabilities. The modular structure allows for easy customization and extension of features.


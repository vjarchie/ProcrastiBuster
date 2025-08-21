# Reading Enhancement Chrome Extension

A Chrome extension designed to improve reading experience by applying Fast Fonts and providing a reading timer with celebration features.

## Features

### 📖 Font Enhancement
- **Fast Fonts**: Apply scientifically designed fonts that improve reading speed and comprehension
- **Multiple Font Options**:
  - Fast Sans - Clean, modern sans-serif
  - Fast Serif - Traditional serif with enhanced readability
  - Fast Mono - Monospace font for technical content
  - Fast Sans Dotted - Sans-serif with dotted characters for better recognition
- **Easy Switching**: Change fonts with a single click
- **Persistent Settings**: Your font preference is saved across sessions

### ⏱️ Reading Timer
- **Floating Timer Widget**: Always visible timer on web pages
- **Start/Stop Controls**: Simple controls to track reading sessions
- **Celebration Popup**: Motivational popup showing total reading time when finished
- **Session Persistence**: Timer state is saved if you accidentally close the popup

## Installation

1. **Download the Extension**:
   - Clone or download this repository
   - Ensure all files are in a single directory

2. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the extension directory

3. **Start Using**:
   - Click the extension icon in your toolbar
   - Select your preferred font and click "Apply Font"
   - Use the timer widget on any webpage

## How to Use

### Font Selection
1. Click the extension icon in your browser toolbar
2. Choose your preferred font from the dropdown
3. Click "Apply Font" to change the webpage font
4. The font will be applied to all text elements on the page

### Reading Timer
1. **On-Page Timer**: A floating timer widget appears on every webpage
2. **Start Timer**: Click "Start" to begin timing your reading session
3. **Stop Timer**: Click "Stop" to end the session
4. **Celebration**: A popup will appear showing your total reading time
5. **Reset**: Use the reset button to clear the timer

## Font Information

The extension uses Fast Fonts, which are scientifically designed to improve reading speed and comprehension:

- **Fast Sans**: Optimized for digital reading with clean, modern design
- **Fast Serif**: Traditional serif font with enhanced readability features
- **Fast Mono**: Monospace font ideal for technical documentation and code
- **Fast Sans Dotted**: Features dotted characters to improve letter recognition

## Technical Details

- **Manifest Version**: 3 (Latest Chrome extension standard)
- **Permissions**: 
  - `activeTab`: To modify the current webpage
  - `storage`: To save user preferences
  - `scripting`: To inject font styles
- **Content Scripts**: Automatically apply fonts and display timer widget
- **Web Accessible Resources**: Font files are accessible to web pages

## Browser Compatibility

- Chrome 88+
- Edge 88+ (Chromium-based)
- Other Chromium-based browsers

## Development

### File Structure
```
ReadingPlugin/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── content.js            # Content script for web pages
├── styles.css            # Additional styling
├── fonts/                # Font files
│   ├── Fast_Sans.ttf
│   ├── Fast_Serif.ttf
│   ├── Fast_Mono.ttf
│   └── Fast_Sans_Dotted.ttf
└── README.md             # This file
```

### Customization

To add new fonts:
1. Add the font file to the `fonts/` directory
2. Update the font selection in `popup.html`
3. Ensure the font name matches the filename (without .ttf extension)

## Contributing

Feel free to submit issues and enhancement requests!

## License

This extension uses Fast Fonts which are subject to their respective licenses. Please refer to the original Fast Font repository for licensing information.

## Support

If you encounter any issues:
1. Check that the extension is properly loaded in Chrome
2. Ensure you're on a supported webpage
3. Try refreshing the page after applying fonts
4. Check the browser console for any error messages

# 🔧 TRANSCRIPT CAPTURE TROUBLESHOOTING GUIDE

**Last Updated**: January 10, 2026

---

## 🎤 HOW TO TEST IF IT'S WORKING

### Step 1: Open Browser Console
Press `F12` or `Right-click → Inspect → Console`

### Step 2: Start Recording
Click "Start Recording" in Hot Seat

### Step 3: Look for These Messages

**✅ SUCCESS - You should see**:
```
🎤 Speech recognition started
Audio chunk: Blob { size: 12345, type: "audio/webm" }
```

**✅ When you speak, you should see**:
```
📝 Transcript updated: Hello this is my pitch
📝 Total transcript length: 25 characters
📝 Transcript updated: about a SaaS platform
📝 Total transcript length: 46 characters
```

**✅ When you end session**:
```
🎤 Speech recognition ended
Transcript saved successfully: 46 characters
```

---

## ❌ COMMON ISSUES & FIXES

### Issue 1: "Speech recognition not supported"

**What you'll see**:
```
⚠️ Toast: "Speech recognition not supported. Transcript won't be captured."
```

**Cause**: Using Firefox or unsupported browser

**Solution**:
1. Use **Google Chrome** (recommended)
2. Use **Microsoft Edge**
3. Use **Safari** (on Mac)

**Note**: The report will still generate, but it won't have your spoken words. It will use the pitch context text you provided instead.

---

### Issue 2: "Microphone permission denied"

**What you'll see**:
```
❌ Speech recognition error: not-allowed
🔴 Toast: "Microphone permission denied. Please allow microphone access."
```

**Solution**:

**Chrome/Edge**:
1. Click the 🔒 lock icon in address bar
2. Find "Microphone" permission
3. Change to "Allow"
4. Refresh the page

**Safari**:
1. Safari → Settings → Websites → Microphone
2. Find your site
3. Change to "Allow"
4. Refresh the page

**System Settings (Mac)**:
1. System Settings → Privacy & Security → Microphone
2. Enable for Chrome/Safari/Edge

**System Settings (Windows)**:
1. Settings → Privacy → Microphone
2. Enable "Allow apps to access your microphone"
3. Enable for your browser

---

### Issue 3: No transcript captured (console shows 0 characters)

**What you'll see**:
```
⚠️ No transcript captured - speech recognition may not be supported or no speech detected
⚠️ Toast: "No speech detected. Report will be generated from context only."
```

**Possible Causes & Solutions**:

**A) Microphone not working**
- Test microphone: Settings → Sound → Input
- Try speaking louder
- Move closer to microphone
- Check if microphone is muted

**B) Wrong microphone selected**
- Browser may be using wrong input device
- Check system settings for default microphone
- Try using headset microphone instead

**C) Background noise**
- Speech recognition needs clear audio
- Move to quieter location
- Use headset with mic

**D) Speaking too fast/unclear**
- Speak clearly and at moderate pace
- Pause briefly between sentences
- Avoid mumbling

---

### Issue 4: Transcript stops capturing mid-session

**What you'll see**:
```
📝 Transcript updated: Hello this is...
[nothing more after this]
```

**Cause**: Speech recognition auto-stops after silence

**Solution**:
- Keep speaking without long pauses (> 10 seconds)
- Recognition is set to `continuous: true` but may still timeout
- If it stops, the partial transcript is still saved

---

### Issue 5: Report generates but has no content

**What you'll see**:
- Report Card loads
- Scores are low (0-20 range)
- Insights say "No meaningful content provided"

**Cause**: Transcript was empty or too short

**Check**:
1. Did you see transcript messages in console?
2. Did you speak for at least 30 seconds?
3. Was speech recognition active (check toast)?

**Solution**:
- Ensure speech recognition is working BEFORE you start your pitch
- Speak for at least 1-2 minutes
- Provide pitch context text in War Room as backup

---

## 🧪 TESTING CHECKLIST

Use this to verify everything is working:

### Before Starting Session
- [ ] Using Chrome, Edge, or Safari (not Firefox)
- [ ] Browser console is open (F12)
- [ ] Microphone permission granted
- [ ] Test microphone in system settings

### During Recording
- [ ] See "🎤 Speech recognition started" in console
- [ ] See "Audio chunk: Blob" messages every second
- [ ] Speak test phrase: "Hello, this is a test"
- [ ] See "📝 Transcript updated: Hello, this is a test"
- [ ] See character count increasing

### After Ending Session
- [ ] See "🎤 Speech recognition ended"
- [ ] See "Transcript saved successfully: X characters"
- [ ] Navigate to Report Card
- [ ] Report loads within 10 seconds
- [ ] Scores are reasonable (not all zeros)
- [ ] Insights mention things you actually said

---

## 🔍 DEBUGGING COMMANDS

Open browser console and run these to check state:

### Check if Speech Recognition is supported:
```javascript
console.log('SpeechRecognition:', window.SpeechRecognition || window.webkitSpeechRecognition);
```

**Expected**: Function definition (not `undefined`)

### Check microphone permissions:
```javascript
navigator.permissions.query({name:'microphone'}).then(result => console.log(result.state));
```

**Expected**: `"granted"` (not `"denied"` or `"prompt"`)

### Test microphone access:
```javascript
navigator.mediaDevices.getUserMedia({audio: true}).then(() => console.log('✅ Microphone works')).catch(e => console.error('❌', e));
```

**Expected**: `"✅ Microphone works"`

---

## 📊 WHAT HAPPENS IF TRANSCRIPT FAILS?

**Good News**: The report will still generate!

### Fallback Behavior:
1. If no transcript captured, a placeholder is saved:
   ```
   "[No speech detected - please ensure microphone is working and browser supports speech recognition]"
   ```

2. Report generation uses:
   - Your pitch context text (from War Room)
   - Any interruptions that occurred
   - Placeholder transcript with note

3. You'll get a basic report, but it won't be as detailed

### To Get Better Reports:
- Provide detailed pitch context text in War Room
- Test speech recognition before your actual pitch
- Use Chrome for best compatibility

---

## 🎯 QUICK FIX SUMMARY

| Problem | Quick Fix |
|---------|-----------|
| Firefox | Switch to Chrome |
| No mic permission | Click lock icon → Allow microphone |
| No speech detected | Speak louder, closer to mic |
| Recognition stops | Keep speaking, avoid long pauses |
| Empty report | Add pitch context text in War Room |

---

## 💡 BEST PRACTICES

### For Best Results:
1. **Use Chrome browser** (best speech recognition)
2. **Use a headset microphone** (clearer audio)
3. **Test first** (do a 10-second test recording)
4. **Speak clearly** (moderate pace, clear pronunciation)
5. **Fill pitch context** (backup for AI analysis)
6. **Watch console** (see real-time feedback)
7. **Check character count** (aim for 500+ characters)

### Good Pitch Length:
- **Minimum**: 1 minute (~ 150-200 words)
- **Optimal**: 2-3 minutes (~ 300-500 words)
- **Maximum**: Timer stops at 3 minutes

### What to Say:
- Your startup idea
- Problem you're solving
- Target market and size
- Your solution and tech
- Business model
- Traction or progress
- Why you'll win

---

## 🚨 EMERGENCY FALLBACK

**If speech recognition completely fails:**

1. **Provide detailed pitch context** in War Room:
   ```
   Write your full pitch as text:
   - What's the problem?
   - What's your solution?
   - Who's the market?
   - What's your business model?
   - What's your traction?
   ```

2. The AI will analyze this text instead

3. You'll still get a valuable report!

---

## 📞 STILL STUCK?

If none of these solutions work:

1. **Check these logs** in console and share them:
   ```
   - Browser name and version
   - Any red errors in console
   - What you see when you click "Start Recording"
   - Character count (if any)
   ```

2. **Try the emergency fallback** (detailed pitch context text)

3. **Test on different device** (phone, different computer)

---

**Remember**: The goal is to help you improve your pitch. Even with transcript issues, you'll get valuable feedback if you provide good pitch context! 🚀

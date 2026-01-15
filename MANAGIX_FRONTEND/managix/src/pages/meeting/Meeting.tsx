import React, { useEffect, useRef, useState } from 'react';
import { Video, PhoneOff, Download, Loader, FileText, CheckCircle, AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

const Meeting = () => {
  const [jitsiApi, setJitsiApi] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isMeetingActive, setIsMeetingActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meetingRoomName, setMeetingRoomName] = useState<string>('');
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const ASSEMBLY_AI_API_KEY = 'bfb72bef9f0642adad5cfa1c1e380945';
  const ASSEMBLY_AI_BASE_URL = 'https://api.assemblyai.com/v2';
  
  // JaaS Configuration
  const JAAS_DOMAIN = '8x8.vc';
  const JAAS_API_SCRIPT = 'https://8x8.vc/vpaas-magic-cookie-9051867536d246689141d1177f2fee3f/external_api.js';
  const JAAS_VPAAS_COOKIE = 'vpaas-magic-cookie-9051867536d246689141d1177f2fee3f';
  
  // JWT Token for recording (you may need to generate this dynamically)
  const JAAS_JWT = 'eyJraWQiOiJ2cGFhcy1tYWdpYy1jb29raWUtOTA1MTg2NzUzNmQyNDY2ODkxNDFkMTE3N2YyZmVlM2YvYTJhMzQ0LVNBTVBMRV9BUFAiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJqaXRzaSIsImlzcyI6ImNoYXQiLCJpYXQiOjE3NjgwMzgzNDUsImV4cCI6MTc2ODA0NTU0NSwibmJmIjoxNzY4MDM4MzQwLCJzdWIiOiJ2cGFhcy1tYWdpYy1jb29raWUtOTA1MTg2NzUzNmQyNDY2ODkxNDFkMTE3N2YyZmVlM2YiLCJjb250ZXh0Ijp7ImZlYXR1cmVzIjp7ImxpdmVzdHJlYW1pbmciOmZhbHNlLCJmaWxlLXVwbG9hZCI6ZmFsc2UsIm91dGJvdW5kLWNhbGwiOmZhbHNlLCJzaXAtb3V0Ym91bmQtY2FsbCI6ZmFsc2UsInRyYW5zY3JpcHRpb24iOmZhbHNlLCJsaXN0LXZpc2l0b3JzIjpmYWxzZSwicmVjb3JkaW5nIjpmYWxzZSwiZmxpcCI6ZmFsc2V9LCJ1c2VyIjp7ImhpZGRlbi1mcm9tLXJlY29yZGVyIjpmYWxzZSwibW9kZXJhdG9yIjp0cnVlLCJuYW1lIjoiVGVzdCBVc2VyIiwiaWQiOiJnb29nbGUtb2F1dGgyfDExNDg1MTUxMjgyMTczODQ5MTcxNiIsImF2YXRhciI6IiIsImVtYWlsIjoidGVzdC51c2VyQGNvbXBhbnkuY29tIn19LCJyb29tIjoiKiJ9.mROI-6w_kfPF3B5AfABsmmQKp5gmG1lEo0tc7SPBZLTsZQ2EiYdSH_NYjG2qFaZZTTIeDhMit5MLV9sJoOXTdgjy2JrzcPJaPObVt-vFzdRr9x_yHaZ-bJTJjLpDo6JzxGHIH0ZDD7d6NxRCM6zseR69kUn-HrC70fCNfLTXtZjvRbA8wgTXXdfXY_KO6hx8SLvMQhod1QbtAsCuVSfsnDFLPmmCFIM0hYOwmnj-5aPOSykEC6j99Gcf9OWvXJ6KYDeCJcnMFxMwRsgTw5hZmUwxQw94guJ4eNW0aRFGbSEG7ffpyfGmK_zRnAR_GSV2Piu36ljFfo3aK8VboX_eHg';

  // Generate unique meeting room name on component mount
  useEffect(() => {
    const userName = localStorage.getItem('userName') || 'User';
    const timestamp = Date.now();
    const roomName = `SampleApp${userName.replace(/\s+/g, '')}${timestamp}`;
    setMeetingRoomName(roomName);
  }, []);

  // Update recording duration every second
  useEffect(() => {
    if (isRecording && recordingStartTime) {
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime.getTime()) / 1000);
        setRecordingDuration(elapsed);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isRecording, recordingStartTime]);

  // Load Jitsi Meet External API script (JaaS version)
  useEffect(() => {
    if (!meetingRoomName) return;

    const script = document.createElement('script');
    script.src = JAAS_API_SCRIPT;
    script.async = true;
    script.onload = () => {
      console.log('✅ Jitsi JaaS API loaded successfully');
      if (jitsiContainerRef.current) {
        initializeJitsi();
      }
    };
    script.onerror = () => {
      setError('Failed to load Jitsi JaaS API. Please check your internet connection.');
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      if (jitsiApi) {
        try {
          jitsiApi.dispose();
        } catch (err) {
          console.error('Error disposing Jitsi API:', err);
        }
      }
    };
  }, [meetingRoomName]);

  const initializeJitsi = () => {
    if (!jitsiContainerRef.current || !meetingRoomName || !window.JitsiMeetExternalAPI) {
      return;
    }

    try {
      // JaaS room name format: vpaas-magic-cookie-{cookie}/{roomName}
      const fullRoomName = `${JAAS_VPAAS_COOKIE}/${meetingRoomName}`;
      
      const options = {
        roomName: fullRoomName,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        jwt: JAAS_JWT, // JWT token for recording and premium features
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableRecording: true, // Enable JaaS recording
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
            'settings', 'raisehand', 'videoquality', 'filmstrip', 'invite',
            'feedback', 'stats', 'shortcuts', 'tileview', 'videobackgroundblur',
            'download', 'help', 'mute-everyone', 'mute-video-everyone', 'security'
          ],
        },
      };

      const api = new window.JitsiMeetExternalAPI(JAAS_DOMAIN, options);
      
      // Event listeners
      api.addEventListener('videoConferenceJoined', () => {
        console.log('✅ Joined JaaS meeting');
        setIsMeetingActive(true);
        setError(null);
        // Automatically start browser recording when meeting starts
        // (JaaS recording requires webhook setup, so we use browser recording for automatic transcription)
        setTimeout(() => {
          console.log('🎬 Starting automatic browser recording...');
          startBrowserRecording();
        }, 3000); // Wait 3 seconds for meeting to fully initialize
      });

      api.addEventListener('videoConferenceLeft', () => {
        console.log('👋 Left meeting');
        setIsMeetingActive(false);
        handleMeetingEnd();
      });

      api.addEventListener('readyToClose', () => {
        console.log('🔚 Meeting ready to close');
        handleMeetingEnd();
      });

      setJitsiApi(api);
    } catch (err: any) {
      console.error('❌ Error initializing Jitsi JaaS:', err);
      setError(`Failed to initialize meeting: ${err.message}`);
    }
  };

  const handleEndMeeting = async () => {
    try {
      console.log('🔚 Ending meeting and processing recording...');
      
      // Step 1: Stop browser recording if active (before ending meeting)
      let finalBlob: Blob | null = null;
      if (isRecording && mediaRecorderRef.current) {
        console.log('🛑 Stopping browser recording...');
        finalBlob = await stopBrowserRecording();
        // Wait a moment for recording to finalize
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else if (recordingBlob) {
        finalBlob = recordingBlob;
      }

      // Step 2: Hangup Jitsi meeting immediately (user can leave)
      if (jitsiApi) {
        jitsiApi.executeCommand('hangup');
        setIsMeetingActive(false);
      }

      // Step 3: Automatically upload and transcribe in background
      if (finalBlob && finalBlob.size > 0) {
        console.log('📤 Starting automatic upload and transcription in background...');
        // Don't await - let it run in background while user can navigate away
        handleAutomaticUploadAndTranscribe(finalBlob).catch((err) => {
          console.error('Error in background transcription:', err);
          setError(`Transcription error: ${err.message}`);
        });
      } else {
        console.warn('⚠️ No recording available for transcription');
        setError('No recording available. Please ensure recording completed successfully.');
      }
    } catch (err: any) {
      console.error('❌ Error ending meeting:', err);
      setError(`Error processing meeting end: ${err.message}`);
      // Still try to hangup
      if (jitsiApi) {
        try {
          jitsiApi.executeCommand('hangup');
          setIsMeetingActive(false);
        } catch (hangupErr) {
          console.error('Error hanging up:', hangupErr);
        }
      }
    }
  };

  const handleMeetingEnd = () => {
    // Cleanup function called by videoConferenceLeft event
    console.log('🧹 Meeting ended - cleanup completed');
  };

  const startBrowserRecording = async () => {
    try {
      setError(null);
      console.log('📹 Starting browser recording...');

      // Step 1: Get screen/tab share (user will be prompted to select the meeting tab)
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          cursor: 'always',
        } as any,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          suppressLocalAudioPlayback: false, // IMPORTANT: Capture audio from the shared tab
        },
      });

      console.log('✅ Screen share obtained');

      // Step 2: Get microphone audio separately (to capture local participant)
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          },
        });
        console.log('✅ Microphone access obtained');
      } catch (micErr) {
        console.warn('⚠️ Could not get microphone access, continuing with screen audio only:', micErr);
      }

      // Step 3: Combine audio streams using Web Audio API
      const audioContext = new AudioContext({ sampleRate: 44100 });
      const destination = audioContext.createMediaStreamDestination();

      // Add screen/tab audio (includes meeting audio)
      if (screenStream.getAudioTracks().length > 0) {
        try {
          const screenAudioSource = audioContext.createMediaStreamSource(screenStream);
          screenAudioSource.connect(destination);
          console.log('✅ Screen audio connected');
        } catch (err) {
          console.warn('⚠️ Could not connect screen audio:', err);
        }
      }

      // Add microphone audio (local participant)
      if (micStream && micStream.getAudioTracks().length > 0) {
        try {
          const micAudioSource = audioContext.createMediaStreamSource(micStream);
          micAudioSource.connect(destination);
          console.log('✅ Microphone audio connected');
        } catch (err) {
          console.warn('⚠️ Could not connect microphone audio:', err);
        }
      }

      // Step 4: Combine video from screen share and mixed audio
      const combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);

      // Fallback: If no audio tracks in combined stream, use screen stream audio directly
      if (combinedStream.getAudioTracks().length === 0) {
        if (screenStream.getAudioTracks().length > 0) {
          combinedStream.addTrack(screenStream.getAudioTracks()[0]);
          console.log('✅ Using screen audio as fallback');
        } else if (micStream && micStream.getAudioTracks().length > 0) {
          combinedStream.addTrack(micStream.getAudioTracks()[0]);
          console.log('✅ Using microphone audio as fallback');
        }
      }

      streamRef.current = combinedStream;
      recordedChunksRef.current = [];

      // Step 5: Create MediaRecorder with best supported format
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }

      console.log('📼 Using MIME type:', mimeType);

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          console.log('📦 Recording chunk:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = async () => {
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: mimeType });
          setRecordingBlob(blob);
          console.log('✅ Recording stopped. Final blob size:', blob.size, 'bytes');
        } else {
          console.warn('⚠️ No recording chunks available');
        }

        // Clean up all streams
        screenStream.getTracks().forEach(track => {
          track.stop();
          console.log('🛑 Stopped screen track:', track.kind);
        });
        if (micStream) {
          micStream.getTracks().forEach(track => {
            track.stop();
            console.log('🛑 Stopped mic track:', track.kind);
          });
        }
        combinedStream.getTracks().forEach(track => track.stop());
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('❌ MediaRecorder error:', event);
        setError('Recording error occurred. Please try again.');
        setIsRecording(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      
      // Start recording, collecting data every second
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingStartTime(new Date());
      setRecordingDuration(0);
      console.log('🎬 Recording started successfully!');

      // Handle when user stops sharing screen/tab
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('⚠️ Screen share ended');
        if (isRecording && mediaRecorderRef.current) {
          stopBrowserRecording();
        }
      });

    } catch (err: any) {
      console.error('❌ Error starting browser recording:', err);
      setError(`Recording setup failed: ${err.message}. Please select "Share tab" when prompted and ensure audio is enabled.`);
      setIsRecording(false);
    }
  };

  const stopBrowserRecording = async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = () => {
          if (recordedChunksRef.current.length > 0) {
            const blob = new Blob(recordedChunksRef.current, { 
              type: mediaRecorderRef.current?.mimeType || 'video/webm' 
            });
            setRecordingBlob(blob);
            setIsRecording(false);
            console.log('✅ Recording stopped. Final blob:', blob.size, 'bytes');
            resolve(blob);
          } else {
            console.warn('⚠️ No recording chunks available');
            setIsRecording(false);
            resolve(null);
          }
        };
        
        mediaRecorderRef.current.stop();
        
        // Stop all tracks immediately
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop();
            console.log('🛑 Stopped track:', track.kind);
          });
        }
      } else {
        setIsRecording(false);
        if (recordingBlob) {
          resolve(recordingBlob);
        } else if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          setRecordingBlob(blob);
          resolve(blob);
        } else {
          resolve(null);
        }
      }
    });
  };


  const handleAutomaticUploadAndTranscribe = async (fileOrBlob: Blob | File) => {
    if (!fileOrBlob || (fileOrBlob instanceof File ? fileOrBlob.size === 0 : fileOrBlob.size === 0)) {
      setError('No recording available to transcribe');
      return;
    }

    setIsUploading(true);
    setIsTranscribing(true);
    setError(null);

    try {
      const size = fileOrBlob instanceof File ? fileOrBlob.size : fileOrBlob.size;
      console.log('📤 Uploading recording to AssemblyAI...', size, 'bytes');
      
      // Step 1: Upload audio/video file to AssemblyAI
      const uploadResponse = await fetch(`${ASSEMBLY_AI_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'authorization': ASSEMBLY_AI_API_KEY,
        },
        body: fileOrBlob,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload recording');
      }

      const uploadData = await uploadResponse.json();
      const audioUrl = uploadData.upload_url;
      console.log('✅ Recording uploaded. URL:', audioUrl);
      setIsUploading(false);

      // Step 2: Submit transcription request
      console.log('📝 Submitting transcription request...');
      const submitResponse = await fetch(`${ASSEMBLY_AI_BASE_URL}/transcript`, {
        method: 'POST',
        headers: {
          'authorization': ASSEMBLY_AI_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: audioUrl,
        }),
      });

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json();
        throw new Error(errorData.error || 'Failed to submit transcription');
      }

      const submitData = await submitResponse.json();
      const transcriptId = submitData.id;
      console.log('✅ Transcription submitted. ID:', transcriptId);

      // Step 3: Poll for transcription result
      await pollTranscriptionStatus(transcriptId);
    } catch (err: any) {
      console.error('❌ Error in automatic upload/transcription:', err);
      setError(`Failed to process recording: ${err.message}`);
      setIsTranscribing(false);
      setIsUploading(false);
    }
  };

  const pollTranscriptionStatus = async (id: string) => {
    const maxAttempts = 120; // 10 minutes max (checking every 5 seconds)
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await fetch(`${ASSEMBLY_AI_BASE_URL}/transcript/${id}`, {
          headers: {
            'authorization': ASSEMBLY_AI_API_KEY,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to check transcription status');
        }

        const data = await response.json();
        console.log(`📊 Transcription status (attempt ${attempts + 1}):`, data.status);

        if (data.status === 'completed') {
          setTranscript(data.text);
          setIsTranscribing(false);
          console.log('✅ Transcription completed!');
        } else if (data.status === 'error') {
          throw new Error(data.error || 'Transcription failed');
        } else if (attempts < maxAttempts) {
          // Still processing, check again in 5 seconds
          attempts++;
          setTimeout(checkStatus, 5000);
        } else {
          throw new Error('Transcription timeout - took too long to complete');
        }
      } catch (err: any) {
        console.error('❌ Error polling transcription:', err);
        setError(`Transcription error: ${err.message}`);
        setIsTranscribing(false);
      }
    };

    checkStatus();
  };

  const handleDownloadTranscript = () => {
    if (!transcript) return;

    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting_transcript_${meetingRoomName}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('📥 Transcript downloaded');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-gray-900 mb-2">
            Virtual Meeting Room
          </h1>
          <p className="text-gray-500 font-bold text-sm tracking-widest uppercase">
            Jitsi as a Service (JaaS) with Automatic Recording & AI Transcription
          </p>
          {meetingRoomName && (
            <p className="text-gray-400 text-xs mt-2">
              Room: <span className="font-bold">{JAAS_VPAAS_COOKIE}/{meetingRoomName}</span>
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 font-bold flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Status Indicators */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 ${
            isMeetingActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isMeetingActive ? 'bg-green-500' : 'bg-gray-400'}`} />
            {isMeetingActive ? 'Meeting Active' : 'Meeting Inactive'}
          </div>
          <div className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 ${
            isRecording ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
            {isRecording ? `Recording: ${formatTime(recordingDuration)}` : 'Not Recording'}
          </div>
          {isUploading && (
            <div className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 bg-purple-100 text-purple-700">
              <Loader className="w-4 h-4 animate-spin" />
              Uploading Recording...
            </div>
          )}
          {isTranscribing && !isUploading && (
            <div className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 bg-blue-100 text-blue-700">
              <Loader className="w-4 h-4 animate-spin" />
              Generating Transcript...
            </div>
          )}
          {transcript && !isTranscribing && (
            <div className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 bg-green-100 text-green-700">
              <CheckCircle className="w-4 h-4" />
              Transcript Ready!
            </div>
          )}
        </div>

        {/* Jitsi Container */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden mb-6">
          <div 
            ref={jitsiContainerRef}
            className="w-full"
            style={{ height: '600px', minHeight: '600px' }}
          />
        </div>

        {/* Control Buttons */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 mb-6">
          <h2 className="text-xl font-black text-gray-900 mb-6">Meeting Controls</h2>
          
          <div className="flex flex-wrap gap-4 mb-6">
            {isMeetingActive && (
              <button
                onClick={handleEndMeeting}
                className="flex items-center gap-3 px-6 py-4 bg-red-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-red-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
              >
                <PhoneOff size={20} />
                End Meeting & Generate Transcript
              </button>
            )}
          </div>

          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
            <p className="text-sm text-indigo-800 font-bold mb-2">
              <strong>🔄 Fully Automatic Mode:</strong>
            </p>
            <ul className="text-xs text-indigo-700 font-medium space-y-1 ml-4 list-disc">
              <li>Meeting uses JaaS (Jitsi as a Service) for stable connection</li>
              <li>Browser recording starts automatically when you join the meeting</li>
              <li>When screen share prompt appears, select "Share tab" and choose the meeting tab</li>
              <li>Make sure to check <strong>"Share tab audio"</strong> when sharing</li>
              <li>Click "End Meeting" to automatically stop recording, upload, and generate transcript</li>
              <li>Download transcript when ready (appears below after 1-3 minutes)</li>
            </ul>
            <p className="text-xs text-indigo-600 font-bold italic mt-2">
              Everything is automated! You only need to select the meeting tab when prompted, 
              then download the transcript when ready.
            </p>
          </div>
        </div>

        {/* Manual Upload Section (backup option) */}
        {!isMeetingActive && !isTranscribing && !transcript && (
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 mb-6">
            <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-3">
              <FileText size={24} />
              Manual Upload (Optional)
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              If automatic recording didn't work or you have a recording file, upload it here to generate the transcript.
            </p>
            <label className="flex items-center gap-3 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 cursor-pointer inline-block">
              <FileText size={20} />
              Upload Recording File (Audio/Video)
              <input
                type="file"
                accept="audio/*,video/*,.mp4,.webm,.m4a,.wav,.mp3"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleAutomaticUploadAndTranscribe(file);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Transcript Section - Below Meeting */}
        {(transcript || isTranscribing || isUploading) && (
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
                <FileText size={24} />
                Meeting Transcript
              </h2>
              {transcript && !isTranscribing && (
                <button
                  onClick={handleDownloadTranscript}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                >
                  <Download size={18} />
                  Download Transcript
                </button>
              )}
            </div>

            {isUploading && (
              <div className="text-center py-12">
                <Loader className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
                <p className="text-gray-600 font-bold">
                  Uploading recording to AssemblyAI... Please wait.
                </p>
              </div>
            )}

            {isTranscribing && !isUploading && (
              <div className="text-center py-12">
                <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600 font-bold">
                  Generating transcript... This may take 1-3 minutes depending on recording length.
                </p>
              </div>
            )}

            {transcript && !isTranscribing && (
              <>
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 mb-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-medium leading-relaxed">
                    {transcript}
                  </pre>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={handleDownloadTranscript}
                    className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                  >
                    <Download size={20} />
                    Download Transcript (.txt)
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="text-sm font-black text-blue-900 mb-3 uppercase tracking-wider">
            How to Use
          </h3>
            <ul className="space-y-2 text-sm text-blue-800 font-medium">
            <li>✅ <strong>Step 1:</strong> Join the meeting (wait for JaaS meeting to load)</li>
            <li>✅ <strong>Step 2:</strong> When screen share prompt appears, <strong>select "Share tab" and choose the meeting tab</strong></li>
            <li>✅ <strong>Step 3:</strong> Make sure <strong>"Share tab audio"</strong> is checked when sharing</li>
            <li>✅ <strong>Step 4:</strong> Browser recording starts automatically - conduct your meeting normally</li>
            <li>✅ <strong>Step 5:</strong> Click "End Meeting" to automatically stop recording, upload, and generate transcript</li>
            <li>✅ <strong>Step 6:</strong> Wait 1-3 minutes for transcript generation (happens automatically)</li>
            <li>✅ <strong>Step 7:</strong> <strong>Download the transcript</strong> when ready (button appears below meeting)</li>
          </ul>
          <p className="mt-4 text-xs text-blue-600 font-bold italic">
            <strong>Fully Automated!</strong> Uses JaaS for meeting + browser recording for automatic transcription. 
            You only need to: (1) Select meeting tab when prompted, and (2) Download transcript when ready.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Meeting;

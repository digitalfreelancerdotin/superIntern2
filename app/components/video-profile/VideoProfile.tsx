'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Loader2, Video, Mic, RefreshCw, Upload, Play, Square, Info } from 'lucide-react';
import { useToast } from '@/app/components/ui/use-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';

interface MediaDevice {
  deviceId: string;
  label: string;
}

export default function VideoProfile({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [videoDevices, setVideoDevices] = useState<MediaDevice[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDevice[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [selectedAudio, setSelectedAudio] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isUrlUploading, setIsUrlUploading] = useState(false);

  const mountedRef = useRef(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number>();
  const timerRef = useRef<NodeJS.Timeout>();

  const forceReleaseDevices = async () => {
    try {
      // First stop any existing streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        streamRef.current = null;
      }
      
      // Clear video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = '';
        videoRef.current.load();
      }

      // Wait a moment before proceeding
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('Existing streams stopped');
    } catch (error) {
      console.error('Error during force release:', error);
    }
  };

  const stopMediaStream = () => {
    try {
      if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => {
          track.stop();
          track.enabled = false;
        });
        streamRef.current = null;
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = '';
        videoRef.current.load();
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      setIsRecording(false);
      setRecordedChunks([]);
      setIsRecordingPaused(false);
      setRecordingTime(0);
      setAudioLevel(0);
      setIsPlaying(false);
    } catch (error) {
      console.error('Error stopping media stream:', error);
    }
  };

  const checkPermissions = async () => {
    try {
      const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
      console.log('Camera permission state:', permissions.state);
      
      const micPermissions = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      console.log('Microphone permission state:', micPermissions.state);
      
      // Only set permission denied if both are denied
      const isDenied = permissions.state === 'denied' || micPermissions.state === 'denied';
      setPermissionDenied(isDenied);
      
      return !isDenied;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return true; // Proceed with requesting if we can't check
    }
  };

  const getDevices = async () => {
    try {
      // First check existing permissions
      const hasPermissions = await checkPermissions();
      if (!hasPermissions) {
        console.log('Permissions are denied, showing permission request UI');
        return;
      }

      // Ensure any existing streams are properly stopped
      stopMediaStream();
      
      // Add a longer delay before requesting streams
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Attempting to initialize media devices...');
      
      try {
        // Try with basic constraints first
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        console.log('Basic media stream obtained successfully');
        
        if (mountedRef.current) {
          // Store the stream
          streamRef.current = stream;
          
          if (videoRef.current) {
            // Ensure video element is properly reset
            videoRef.current.srcObject = null;
            videoRef.current.load();
            
            // Small delay before setting the stream
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Set the stream and attempt playback
            videoRef.current.srcObject = stream;
            videoRef.current.muted = true;
            
            try {
              await videoRef.current.play();
              console.log('Video playback started successfully');
            } catch (playError) {
              console.error('Error playing video:', playError);
              // If play fails, try with only video
              const videoTrack = stream.getVideoTracks()[0];
              if (videoTrack) {
                const videoStream = new MediaStream([videoTrack]);
                videoRef.current.srcObject = videoStream;
                await videoRef.current.play();
                console.log('Video-only playback started');
              }
            }
          }
          
          // Now enumerate devices for the dropdowns
          const devices = await navigator.mediaDevices.enumerateDevices();
          
          const videoInputs = devices
            .filter(device => device.kind === 'videoinput')
            .map(device => ({ deviceId: device.deviceId, label: device.label || `Camera ${device.deviceId.slice(0, 4)}` }));
          
          const audioInputs = devices
            .filter(device => device.kind === 'audioinput')
            .map(device => ({ deviceId: device.deviceId, label: device.label || `Microphone ${device.deviceId.slice(0, 4)}` }));

          if (videoInputs.length > 0) {
            setVideoDevices(videoInputs);
            setSelectedVideo(videoInputs[0].deviceId);
          }

          if (audioInputs.length > 0) {
            setAudioDevices(audioInputs);
            setSelectedAudio(audioInputs[0].deviceId);
          }
        }
      } catch (error: any) {
        console.error('Media stream error:', error);
        let errorMessage = 'Unable to access camera and microphone.';
        let hasPermissionError = false;

        if (error.name === 'NotReadableError') {
          errorMessage = 'Camera or microphone is in use. Please try these steps:\n' +
            '1. Close ALL browser windows completely\n' +
            '2. Close any apps using the camera/mic\n' +
            '3. Restart your browser\n' +
            '4. If the issue persists, restart your computer';
        } else if (error.name === 'NotAllowedError') {
          errorMessage = 'Access was denied. Please check your browser settings and ensure camera/microphone access is allowed for this site.';
          hasPermissionError = true;
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera or microphone detected. Please connect the devices and refresh the page.';
        }

        toast({
          title: 'Device Access Error',
          description: errorMessage,
          variant: 'destructive',
        } as any);

        setPermissionDenied(hasPermissionError);
      }
    } catch (error) {
      console.error('Error in getDevices:', error);
      toast({
        title: 'Device Access Error',
        description: 'Failed to initialize camera and microphone. Please try using Chrome or Edge browser.',
        variant: 'destructive',
      } as any);
    }
  };

  const requestPermissions = async () => {
    console.log('Requesting permissions...');
    setPermissionDenied(false);
    await getDevices();
  };

  useEffect(() => {
    console.log('Component mounted, initializing devices...');
    getDevices();
    
    // Add device change listener
    const handleDeviceChange = () => {
      console.log('Media devices changed, reinitializing...');
      getDevices();
    };
    
    navigator.mediaDevices.ondevicechange = handleDeviceChange;
    
    return () => {
      console.log('Component unmounting, cleaning up...');
      mountedRef.current = false;
      stopMediaStream();
      navigator.mediaDevices.ondevicechange = null;
    };
  }, [toast]);

  const startRecording = async () => {
    try {
      if (!streamRef.current) {
        throw new Error('No media stream available');
      }

      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setRecordedChunks(chunksRef.current);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev: number) => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Recording Error',
        description: error instanceof Error ? error.message : 'Failed to start recording',
        variant: 'destructive',
      } as any);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      stopMediaStream();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const discardRecording = () => {
    setRecordedBlob(null);
    if (videoRef.current) {
      videoRef.current.src = '';
    }
  };

  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const uploadVideo = async () => {
    if (!recordedBlob) return;

    setIsUploading(true);
    try {
      const supabase = createClientComponentClient();
      const fileName = `${userId}/profile-video-${Date.now()}.webm`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('profile-videos')
        .upload(fileName, recordedBlob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('profile-videos')
        .getPublicUrl(fileName);

      // Update profile with video URL
      const { error: updateError } = await supabase
        .from('intern_profiles')
        .update({ video_url: data.publicUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: 'Video profile uploaded successfully.',
      });
    } catch (error) {
      console.error('Error uploading video:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload video. Please try again.',
        variant: 'destructive',
      } as any);
    } finally {
      setIsUploading(false);
    }
  };

  const uploadVideoUrl = async () => {
    if (!videoUrl) return;

    setIsUrlUploading(true);
    try {
      const supabase = createClientComponentClient();

      // First check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('intern_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw new Error('Could not find your profile');
      }

      if (!profile) {
        // Create profile if it doesn't exist
        const { error: insertError } = await supabase
          .from('intern_profiles')
          .insert([
            { 
              user_id: userId,
              video_url: videoUrl,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]);

        if (insertError) {
          console.error('Error creating profile:', insertError);
          throw insertError;
        }
      } else {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('intern_profiles')
          .update({ 
            video_url: videoUrl,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error updating profile:', updateError);
          throw updateError;
        }
      }

      toast({
        title: 'Success',
        description: 'Video URL saved successfully.',
      });

      // Fetch and log the saved data to verify
      const { data: verification, error: verifyError } = await supabase
        .from('intern_profiles')
        .select('video_url')
        .eq('user_id', userId)
        .single();

      if (verifyError) {
        console.error('Error verifying save:', verifyError);
      } else {
        console.log('Saved video_url:', verification.video_url);
      }

    } catch (error) {
      console.error('Error saving video URL:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save video URL. Please try again.',
        variant: 'destructive',
      } as any);
    } finally {
      setIsUrlUploading(false);
    }
  };

  // Add useEffect to fetch existing video URL when component mounts
  useEffect(() => {
    const fetchVideoUrl = async () => {
      try {
        const supabase = createClientComponentClient();
        const { data, error } = await supabase
          .from('intern_profiles')
          .select('video_url')
          .eq('user_id', userId)
          .single();

        if (error) {
          console.error('Error fetching video URL:', error);
        } else if (data?.video_url) {
          setVideoUrl(data.video_url);
        }
      } catch (error) {
        console.error('Error in fetchVideoUrl:', error);
      }
    };

    fetchVideoUrl();
  }, [userId]);

  return (
    <div className="h-[calc(100vh-120px)] p-4">
      <div className="h-full grid grid-cols-2 gap-6">
        {/* Left Column - Video Recording */}
        <div className="flex flex-col items-center">
          <div className="w-full max-w-[240px] mx-auto">
            <Card className="relative aspect-[9/12] overflow-hidden bg-black">
              {permissionDenied ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-gray-900">
                  <div className="text-white mb-2">
                    <h3 className="text-lg font-semibold mb-1">Permission Required</h3>
                    <p className="text-xs text-gray-300 mb-3">
                      Camera and microphone access needed
                    </p>
                    <Button onClick={requestPermissions} variant="secondary" size="sm">
                      Request Permission
                    </Button>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    <p>If denied:</p>
                    <ol className="text-left list-decimal pl-3">
                      <li>Click camera icon in address bar</li>
                      <li>Allow camera and microphone</li>
                      <li>Click "Request Permission"</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    playsInline
                    muted={isRecording}
                    onEnded={() => setIsPlaying(false)}
                  />
                  {isRecording && (
                    <>
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all duration-100"
                            style={{ width: `${(audioLevel / 255) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 bg-red-500 px-1.5 py-0.5 rounded text-white text-[10px]">
                        {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                      </div>
                    </>
                  )}
                </>
              )}
            </Card>
          </div>

          {!permissionDenied && (
            <div className="mt-3 space-y-2 w-full max-w-[240px]">
              <div className="grid grid-cols-2 gap-1.5">
                <div className="relative z-50">
                  <Select
                    value={selectedVideo}
                    onValueChange={setSelectedVideo}
                    disabled={isRecording}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Select camera" />
                    </SelectTrigger>
                    <SelectContent position="popper" side="bottom" className="w-[120px]">
                      {videoDevices.map(device => (
                        <SelectItem key={device.deviceId} value={device.deviceId} className="text-xs">
                          {device.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative z-50">
                  <Select
                    value={selectedAudio}
                    onValueChange={setSelectedAudio}
                    disabled={isRecording}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Select mic" />
                    </SelectTrigger>
                    <SelectContent position="popper" side="bottom" className="w-[120px]">
                      {audioDevices.map(device => (
                        <SelectItem key={device.deviceId} value={device.deviceId} className="text-xs">
                          {device.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-center gap-1.5">
                {!recordedBlob ? (
                  <Button
                    variant={isRecording ? "destructive" : "default"}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isUploading}
                    size="sm"
                    className="h-7 text-xs px-2"
                  >
                    {isRecording ? (
                      <>
                        <Square className="w-3 h-3 mr-1" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Video className="w-3 h-3 mr-1" />
                        Record
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={togglePlayback}
                      disabled={isUploading}
                      size="sm"
                      className="h-7 text-xs px-2"
                    >
                      {isPlaying ? (
                        <>
                          <Square className="w-3 h-3 mr-1" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 mr-1" />
                          Play
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={discardRecording}
                      disabled={isUploading}
                      size="sm"
                      className="h-7 text-xs px-2"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Retry
                    </Button>
                    <Button
                      onClick={uploadVideo}
                      disabled={isUploading}
                      size="sm"
                      className="h-7 text-xs px-2"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Saving
                        </>
                      ) : (
                        <>
                          <Upload className="w-3 h-3 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Video URL Upload */}
        <div className="flex flex-col space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Having Issues Recording?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              If you're experiencing technical difficulties with direct recording, don't worry! You can alternatively record your video separately and upload it to any of these platforms:
            </p>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3 mb-4">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                <strong>Note:</strong> You only need to either record directly OR provide a video link - not both.
              </p>
            </div>
            <ul className="text-sm space-y-2 mb-4">
              <li className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span>YouTube (set visibility to "Unlisted" for privacy)</span>
              </li>
              <li className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span>Vimeo</span>
              </li>
              <li className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span>Google Drive (make sure to set link sharing to "Anyone with the link")</span>
              </li>
              <li className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span>Microsoft OneDrive</span>
              </li>
            </ul>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="video-url">Video URL</Label>
                <Input
                  id="video-url"
                  type="url"
                  placeholder="https://"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
                {videoUrl && (
                  <p className="text-xs text-muted-foreground">
                    Current URL: {videoUrl}
                  </p>
                )}
              </div>
              <Button 
                onClick={uploadVideoUrl}
                disabled={!videoUrl || isUrlUploading}
                className="w-full"
              >
                {isUrlUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving URL...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Save URL
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Tips for a Great Video</h3>
            <ul className="text-sm space-y-2">
              <li className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span>Keep it under 2-3 minutes</span>
              </li>
              <li className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span>Ensure good lighting and clear audio</span>
              </li>
              <li className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span>Introduce yourself and your key skills</span>
              </li>
              <li className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span>Share your motivation and career goals</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 
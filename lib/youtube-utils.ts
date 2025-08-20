// YouTube URL detection and parsing utilities

export function isYouTubeUrl(url: string): boolean {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/i;
  return youtubeRegex.test(url);
}

export function extractYouTubeVideoId(url: string): string | null {
  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtu\.be\/)([^#&?]*)/,
    /^([^#&?]*)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'hq' | 'mq' | 'sd' | 'maxres' = 'hq'): string {
  const qualityMap = {
    'default': 'default',
    'hq': 'hqdefault',
    'mq': 'mqdefault', 
    'sd': 'sddefault',
    'maxres': 'maxresdefault'
  };
  
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

export function detectYouTubeLinks(text: string): { url: string; videoId: string }[] {
  const urlRegex = /(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+(&[\w=]*)?/gi;
  const matches = text.match(urlRegex) || [];
  
  return matches
    .map(url => {
      const videoId = extractYouTubeVideoId(url);
      return videoId ? { url, videoId } : null;
    })
    .filter((item): item is { url: string; videoId: string } => item !== null);
}
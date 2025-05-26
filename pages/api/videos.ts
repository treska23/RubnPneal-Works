// pages/api/videos.ts
import type { NextApiRequest, NextApiResponse } from "next";

type Video = {
  videoId: string;
  title: string;
  thumbnail: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Video[]>
) {
  const key = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  const max = 12; // cuantos vídeos sacar

  const url =
    `https://www.googleapis.com/youtube/v3/search?key=${key}` +
    `&channelId=${channelId}&part=snippet,id&order=date&maxResults=${max}`;

  type YoutubeApiItem = {
    id: { videoId?: string };
    snippet: {
      title: string;
      thumbnails: { medium: { url: string } };
    };
  };

  const data = await fetch(url).then((r) => r.json());
  const videos: Video[] = (data.items as YoutubeApiItem[])
    .filter((item) => item.id.videoId)
    .map((item) => ({
      videoId: item.id.videoId!,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
    }));

  res.status(200).json(videos);
}

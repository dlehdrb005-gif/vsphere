import {
  clips as fallbackClips,
  contents as fallbackContents,
  heroSlides as fallbackHeroSlides,
  type Clip,
  type ClipCategory,
  type ContentSchedule,
} from "@/lib/data";
import { supabase } from "@/lib/supabase";

type HeroSlide = {
  title: string;
  text: string;
  signal: string;
};

type ClipRow = {
  id: number;
  streamer: string;
  title: string;
  category: ClipCategory;
  tags: string[] | null;
  views: string;
};

type ContentRow = {
  id: number;
  day: string;
  time: string;
  title: string;
  description: string;
  status: ContentSchedule["status"];
};

type HeroSlideRow = {
  title: string;
  text: string;
  signal: string;
};

export async function getHeroSlides(): Promise<HeroSlide[]> {
  if (!supabase) return fallbackHeroSlides;

  const { data, error } = await supabase
    .from("vsphere_hero_slides")
    .select("title,text,signal")
    .order("sort_order", { ascending: true });

  if (error || !data?.length) return fallbackHeroSlides;

  return (data as HeroSlideRow[]).map((slide) => ({
    title: slide.title,
    text: slide.text,
    signal: slide.signal,
  }));
}

export async function getClips(): Promise<Clip[]> {
  if (!supabase) return fallbackClips;

  const { data, error } = await supabase
    .from("vsphere_clips")
    .select("id,streamer,title,category,tags,views")
    .order("id", { ascending: true });

  if (error || !data?.length) return fallbackClips;

  return (data as ClipRow[]).map((clip) => ({
    id: clip.id,
    streamer: clip.streamer,
    title: clip.title,
    category: clip.category,
    tags: clip.tags ?? [],
    views: clip.views,
  }));
}

export async function getContents(): Promise<ContentSchedule[]> {
  if (!supabase) return fallbackContents;

  const { data, error } = await supabase
    .from("vsphere_contents")
    .select("id,day,time,title,description,status")
    .order("id", { ascending: true });

  if (error || !data?.length) return fallbackContents;

  return (data as ContentRow[]).map((content) => ({
    id: content.id,
    day: content.day,
    time: content.time,
    title: content.title,
    desc: content.description,
    status: content.status,
  }));
}

export async function getHomeData() {
  const [heroSlides, clips, contents] = await Promise.all([getHeroSlides(), getClips(), getContents()]);

  return { heroSlides, clips, contents };
}

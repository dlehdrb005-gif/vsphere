import { HomeExperience } from "@/components/home-experience";
import { getHomeData } from "@/lib/vsphere-data";

export default async function HomePage() {
  const { clips, contents, heroSlides } = await getHomeData();

  return <HomeExperience clips={clips} contents={contents} heroSlides={heroSlides} />;
}

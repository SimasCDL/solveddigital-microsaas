/** Sample tour clips shown in the auto-scrolling "The work" carousel. */
export interface WorkTour {
  src: string;
  label: string;
  duration: string;
}

export const WORK_TOURS: WorkTour[] = [
  {
    src: "/work/glass-exterior.mp4",
    label: "Modern glass exterior",
    duration: "0:03",
  },
  { src: "/work/kitchen.mp4", label: "Modern kitchen", duration: "0:04" },
  {
    src: "/work/livingroom.mp4",
    label: "Sunlit living room",
    duration: "0:04",
  },
  { src: "/work/bedroom.mp4", label: "Primary suite", duration: "0:02" },
  { src: "/work/pool.mp4", label: "Backyard & pool", duration: "0:03" },
  { src: "/work/firepit.mp4", label: "Fire pit at dusk", duration: "0:03" },
  { src: "/work/skyline.mp4", label: "Skyline living room", duration: "0:05" },
  { src: "/work/twilight.mp4", label: "Twilight exterior", duration: "0:03" },
];

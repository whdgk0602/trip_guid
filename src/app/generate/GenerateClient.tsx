"use client";

import { useEffect, useState } from "react";
import { getLoadingPhaseText } from "./loadingPhase";

type Spot = {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
};

type Course = {
  title: string;
  intro: string;
  spots: Spot[];
};

export default function GenerateClient({ text }: { text: string }) {
  const [phaseText, setPhaseText] = useState(() => getLoadingPhaseText(0));
  const [course, setCourse] = useState<Course | null>(null);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setPhaseText(getLoadingPhaseText(Date.now() - startedAt));
    }, 100);

    fetch("/api/routes/generate", {
      method: "POST",
      body: JSON.stringify({ text }),
    })
      .then((response) => response.json())
      .then((data: Course) => {
        clearInterval(timer);
        setCourse(data);
      });

    return () => clearInterval(timer);
  }, [text]);

  if (!course) {
    return <p>{phaseText}</p>;
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4 p-4">
      <h1 className="text-xl font-bold break-words">{course.title}</h1>
      <p className="break-words">{course.intro}</p>
      <ul className="flex flex-col gap-3">
        {course.spots.map((spot) => (
          <li key={spot.id} className="rounded-lg border p-3">
            <p className="font-medium break-words">
              {spot.name} ({spot.category})
            </p>
            <p className="break-words text-sm">{spot.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
    <div>
      <h1>{course.title}</h1>
      <p>{course.intro}</p>
      <ul>
        {course.spots.map((spot) => (
          <li key={spot.id}>
            <p>
              {spot.name} ({spot.category})
            </p>
            <p>{spot.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

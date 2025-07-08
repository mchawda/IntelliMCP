"use client";

import React, { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { type Container, type ISourceOptions } from "@tsparticles/engine";
// If you need specific shapes or interactions, import them here
import { loadSlim } from "@tsparticles/slim"; // loads tsparticles-slim
// import { loadFull } from "tsparticles"; // Loads all features
// import { loadBasic } from "@tsparticles/basic"; // Loads basic features

const AnimatedBackground: React.FC = () => {
  const [init, setInit] = useState(false);

  // This should be run only once per application lifetime
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      // Load the basic preset. 
      // You can change this to loadFull or other presets/plugins as needed.
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = async (container?: Container): Promise<void> => {
    console.log("Particles container loaded", container);
  };

  const options: ISourceOptions = useMemo(
    () => ({
      background: {
        color: {
          value: "#000000", // Keep black background
        },
      },
      fpsLimit: 60,
      interactivity: {
        events: {
          onClick: {
            enable: false, // Keep click disabled
            mode: "push",
          },
          onHover: {
            enable: true, // Enable hover interactivity
            mode: "repulse", // Make particles move away from cursor
          },
        },
        modes: {
          push: {
            quantity: 4,
          },
          repulse: {
            distance: 150, // Increase repel distance slightly
            duration: 0.4,
          },
        },
      },
      particles: {
        color: {
          value: "#ffffff",
        },
        links: {
          color: "#ffffff",
          distance: 150,
          enable: true, // Enable links between particles
          opacity: 0.3, // Make links subtle
          width: 1,
        },
        move: {
          direction: "none",
          enable: true,
          outModes: {
            default: "bounce",
          },
          random: true, // More random movement
          speed: 1.5, // Slightly slower speed
          straight: false,
        },
        number: {
          density: {
            enable: true,
          },
          value: 60, // Slightly fewer particles
        },
        opacity: {
          value: 0.4, // Slightly more visible particles
        },
        shape: {
          type: "circle",
        },
        size: {
          value: { min: 1, max: 3 }, // Smaller particles
        },
      },
      detectRetina: true,
    }),
    [],
  );

  if (init) {
    return (
      <Particles
        id="tsparticles"
        particlesLoaded={particlesLoaded}
        options={options}
        className="absolute inset-0 z-[-1]" // Ensure it stays in the background
      />
    );
  }

  return <></>;
};

export default AnimatedBackground; 
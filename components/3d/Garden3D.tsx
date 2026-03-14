// @ts-nocheck
"use client";

import { Suspense, useRef, useState, useMemo } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Html, Sky, Cloud, Float } from "@react-three/drei";
import * as THREE from "three";
import { Planting, Plot, GrassArea, GardenPath, Fence } from "@/lib/types";
import { useCatalogStore } from "@/lib/store";
import { getStatusColor } from "@/lib/growthEngine";

interface Garden3DProps {
  plantings: Planting[];
  plots: Plot[];
  grassAreas: GrassArea[];
  paths: GardenPath[];
  fences: Fence[];
  width: number;
  height: number;
  onPlantClick?: (planting: Planting) => void;
}

// ============ Sky & Atmosphere ============

function SunLight({ width, height }: { width: number; height: number }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useFrame((state) => {
    if (lightRef.current) {
      const t = state.clock.getElapsedTime() * 0.05;
      lightRef.current.position.x = width / 2 + Math.cos(t) * 8;
      lightRef.current.position.z = height / 2 + Math.sin(t) * 8;
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} color="#FFF8E7" />
      <directionalLight
        ref={lightRef}
        position={[width / 2 + 5, 12, height / 2 + 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.001}
        color="#FFF5E0"
      />
      <hemisphereLight
        args={["#87CEEB", "#228B22", 0.4]}
      />
    </>
  );
}

function Clouds3D({ width, height }: { width: number; height: number }) {
  return (
    <group>
      <Cloud
        position={[width / 2 - 3, 8, height / 2 - 4]}
        speed={0.2}
        opacity={0.6}
        width={4}
        depth={1.5}
        segments={20}
      />
      <Cloud
        position={[width / 2 + 4, 9, height / 2 + 2]}
        speed={0.15}
        opacity={0.5}
        width={5}
        depth={2}
        segments={20}
      />
      <Cloud
        position={[width / 2 - 1, 7.5, height / 2 + 5]}
        speed={0.25}
        opacity={0.4}
        width={3}
        depth={1}
        segments={15}
      />
    </group>
  );
}

// ============ Ground & Terrain ============

function BaseGround({ width, height }: { width: number; height: number }) {
  const padding = 3;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[width / 2, -0.05, height / 2]}
      receiveShadow
    >
      <planeGeometry args={[width + padding * 2, height + padding * 2]} />
      <meshStandardMaterial
        color="#4A7C2E"
        roughness={0.9}
        metalness={0}
      />
    </mesh>
  );
}

function GardenSoil({ width, height }: { width: number; height: number }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[width / 2, -0.02, height / 2]}
      receiveShadow
    >
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        color="#8B6914"
        roughness={0.95}
        metalness={0}
      />
    </mesh>
  );
}

// Decorative grass tufts around garden border
function GrassTufts({ width, height }: { width: number; height: number }) {
  const tufts = useMemo(() => {
    const result = [];
    const count = Math.floor((width + height) * 4);
    for (let i = 0; i < count; i++) {
      const side = Math.floor(Math.random() * 4);
      let x, z;
      const offset = 0.3 + Math.random() * 1.5;
      switch (side) {
        case 0: x = Math.random() * width; z = -offset; break;
        case 1: x = Math.random() * width; z = height + offset; break;
        case 2: x = -offset; z = Math.random() * height; break;
        default: x = width + offset; z = Math.random() * height; break;
      }
      result.push({
        position: [x, 0, z] as [number, number, number],
        scale: 0.5 + Math.random() * 0.5,
        rotation: Math.random() * Math.PI * 2,
        color: `hsl(${100 + Math.random() * 30}, ${60 + Math.random() * 20}%, ${25 + Math.random() * 15}%)`,
      });
    }
    return result;
  }, [width, height]);

  return (
    <group>
      {tufts.map((tuft, i) => (
        <mesh
          key={i}
          position={tuft.position}
          rotation={[0, tuft.rotation, 0]}
          scale={tuft.scale}
        >
          <coneGeometry args={[0.06, 0.15, 4]} />
          <meshStandardMaterial color={tuft.color} />
        </mesh>
      ))}
    </group>
  );
}

// ============ Plots (Raised Beds) ============

function PlotBed({ plot }: { plot: Plot }) {
  const bedHeight = 0.15;

  return (
    <group position={[plot.x, 0, plot.y]}>
      {/* Wooden border */}
      <mesh position={[plot.width / 2, bedHeight / 2, plot.height / 2]} castShadow receiveShadow>
        <boxGeometry args={[plot.width, bedHeight, plot.height]} />
        <meshStandardMaterial
          color="#5D3A1A"
          roughness={0.8}
        />
      </mesh>

      {/* Soil on top */}
      <mesh
        position={[plot.width / 2, bedHeight + 0.001, plot.height / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[plot.width - 0.06, plot.height - 0.06]} />
        <meshStandardMaterial
          color={plot.color || "#654321"}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Top edge trim */}
      {/* Front */}
      <mesh position={[plot.width / 2, bedHeight, 0]} castShadow>
        <boxGeometry args={[plot.width + 0.06, 0.04, 0.06]} />
        <meshStandardMaterial color="#8B5A2B" roughness={0.7} />
      </mesh>
      {/* Back */}
      <mesh position={[plot.width / 2, bedHeight, plot.height]} castShadow>
        <boxGeometry args={[plot.width + 0.06, 0.04, 0.06]} />
        <meshStandardMaterial color="#8B5A2B" roughness={0.7} />
      </mesh>
      {/* Left */}
      <mesh position={[0, bedHeight, plot.height / 2]} castShadow>
        <boxGeometry args={[0.06, 0.04, plot.height]} />
        <meshStandardMaterial color="#8B5A2B" roughness={0.7} />
      </mesh>
      {/* Right */}
      <mesh position={[plot.width, bedHeight, plot.height / 2]} castShadow>
        <boxGeometry args={[0.06, 0.04, plot.height]} />
        <meshStandardMaterial color="#8B5A2B" roughness={0.7} />
      </mesh>

      {/* Name label */}
      <Html position={[plot.width / 2, bedHeight + 0.3, plot.height / 2]} center>
        <div className="bg-amber-900/80 text-amber-100 px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap select-none pointer-events-none">
          {plot.name}
        </div>
      </Html>
    </group>
  );
}

// ============ Plants ============

interface PlantMarkerProps {
  planting: Planting;
  emoji: string;
  plotHeight: number;
  onClick?: () => void;
}

function PlantMarker({ planting, emoji, plotHeight, onClick }: PlantMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const statusColor = getStatusColor(planting.status);
  const scale = planting.growthStage / 100;
  const stemHeight = 0.08 + scale * 0.35;

  // Gentle swaying animation
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      const id = planting.id.charCodeAt(0) * 0.1;
      groupRef.current.rotation.z = Math.sin(t * 1.5 + id) * 0.05;
      groupRef.current.rotation.x = Math.cos(t * 1.2 + id) * 0.03;

      if (hovered) {
        groupRef.current.scale.setScalar(1.15 + Math.sin(t * 3) * 0.05);
      } else {
        groupRef.current.scale.setScalar(1);
      }
    }
  });

  const baseY = plotHeight;

  // Determine plant visual based on status
  const isFlowering = planting.status === "flowering";
  const isReady = planting.status === "ready";
  const isDead = planting.status === "dead";
  const isHarvested = planting.status === "harvested";

  return (
    <group position={[planting.position.x, baseY, planting.position.y]}>
      <group ref={groupRef}>
        {/* Stem */}
        <mesh
          position={[0, stemHeight / 2, 0]}
          castShadow
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            onClick?.();
          }}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <cylinderGeometry args={[0.015 + scale * 0.01, 0.025, stemHeight, 6]} />
          <meshStandardMaterial
            color={isDead ? "#8B7355" : isHarvested ? "#A0A0A0" : "#2D5016"}
            emissive={hovered ? "#446622" : "#000000"}
            emissiveIntensity={hovered ? 0.3 : 0}
          />
        </mesh>

        {/* Leaves (2-4 based on growth) */}
        {!isDead && !isHarvested && scale > 0.1 && (
          <>
            <mesh
              position={[0.04, stemHeight * 0.4, 0]}
              rotation={[0, 0, -0.5]}
              castShadow
            >
              <sphereGeometry args={[0.04 + scale * 0.02, 6, 4]} />
              <meshStandardMaterial color="#3A7D0A" flatShading />
            </mesh>
            <mesh
              position={[-0.04, stemHeight * 0.5, 0.02]}
              rotation={[0, Math.PI * 0.7, 0.5]}
              castShadow
            >
              <sphereGeometry args={[0.035 + scale * 0.02, 6, 4]} />
              <meshStandardMaterial color="#4A8C1A" flatShading />
            </mesh>
          </>
        )}
        {!isDead && !isHarvested && scale > 0.4 && (
          <>
            <mesh
              position={[0.02, stemHeight * 0.65, -0.04]}
              rotation={[0.3, Math.PI * 1.3, -0.4]}
              castShadow
            >
              <sphereGeometry args={[0.03 + scale * 0.015, 6, 4]} />
              <meshStandardMaterial color="#3E8B15" flatShading />
            </mesh>
          </>
        )}

        {/* Top: flower or fruit */}
        {isFlowering && (
          <mesh position={[0, stemHeight + 0.04, 0]} castShadow>
            <dodecahedronGeometry args={[0.05 + scale * 0.02, 0]} />
            <meshStandardMaterial
              color="#FFD700"
              emissive="#FFD700"
              emissiveIntensity={0.2}
            />
          </mesh>
        )}
        {isReady && (
          <mesh position={[0, stemHeight + 0.05, 0]} castShadow>
            <sphereGeometry args={[0.06 + scale * 0.03, 8, 8]} />
            <meshStandardMaterial
              color={statusColor}
              emissive={statusColor}
              emissiveIntensity={0.15}
              roughness={0.3}
            />
          </mesh>
        )}

        {/* Small soil mound at base */}
        <mesh position={[0, 0.01, 0]} castShadow>
          <sphereGeometry args={[0.04, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#654321" roughness={1} />
        </mesh>

        {/* Emoji floating above */}
        <Html position={[0, stemHeight + 0.2, 0]} center>
          <div
            className={`text-lg cursor-pointer transition-all select-none ${
              hovered ? "scale-150 drop-shadow-lg" : "drop-shadow-md"
            }`}
            style={{
              filter: isDead ? "grayscale(1) opacity(0.5)" : isHarvested ? "opacity(0.5)" : "none",
            }}
            onClick={onClick}
          >
            {emoji}
          </div>
        </Html>

        {/* Hover tooltip */}
        {hovered && (
          <Html position={[0, stemHeight + 0.45, 0]} center>
            <div className="bg-black/85 text-white px-3 py-1.5 rounded-lg text-xs whitespace-nowrap shadow-xl border border-white/10 select-none pointer-events-none">
              <div className="font-bold">{planting.plantName}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: statusColor }}
                />
                <span className="text-green-300">{planting.growthStage}%</span>
              </div>
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

// ============ Grass Areas ============

function GrassArea3D({ grass }: { grass: GrassArea }) {
  const blades = useMemo(() => {
    const result = [];
    const density = 80;
    const count = Math.floor(grass.width * grass.height * density);
    for (let i = 0; i < Math.min(count, 500); i++) {
      result.push({
        x: grass.x + Math.random() * grass.width,
        z: grass.y + Math.random() * grass.height,
        height: 0.05 + Math.random() * 0.12,
        phase: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 0.8,
      });
    }
    return result;
  }, [grass]);

  const grassColors: Record<string, string> = {
    lawn: "#32CD32",
    wild: "#2E8B57",
    ornamental: "#9ACD32",
  };

  const baseColor = grassColors[grass.grassType] || "#32CD32";

  return (
    <group>
      {/* Base grass plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[grass.x + grass.width / 2, -0.01, grass.y + grass.height / 2]}
        receiveShadow
      >
        <planeGeometry args={[grass.width, grass.height]} />
        <meshStandardMaterial color={baseColor} roughness={0.9} />
      </mesh>

      {/* Individual grass blades */}
      {blades.map((blade, i) => (
        <GrassBlade key={i} x={blade.x} z={blade.z} height={blade.height} phase={blade.phase} speed={blade.speed} color={baseColor} />
      ))}
    </group>
  );
}

function GrassBlade({ x, z, height, phase, speed, color }: { x: number; z: number; height: number; phase: number; speed: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.getElapsedTime() * speed + phase;
      ref.current.rotation.z = Math.sin(t) * 0.2;
      ref.current.rotation.x = Math.cos(t * 0.7) * 0.1;
    }
  });

  return (
    <mesh ref={ref} position={[x, height / 2, z]}>
      <boxGeometry args={[0.01, height, 0.005]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// ============ Garden Paths ============

function Path3D({ path }: { path: GardenPath }) {
  const pathColors: Record<string, string> = {
    gravel: "#A0A0A0",
    stone: "#808080",
    wood: "#8B4513",
    brick: "#B22222",
  };

  const color = pathColors[path.style] || "#A0A0A0";

  return (
    <group>
      {path.points.map((point, i) => {
        if (i === path.points.length - 1) return null;
        const next = path.points[i + 1];
        const dx = next.x - point.x;
        const dz = next.y - point.y;
        const length = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dx, dz);
        const midX = (point.x + next.x) / 2;
        const midZ = (point.y + next.y) / 2;

        return (
          <group key={i}>
            {/* Path segment */}
            <mesh
              position={[midX, 0.005, midZ]}
              rotation={[- Math.PI / 2, 0, -angle]}
              receiveShadow
            >
              <planeGeometry args={[path.width, length]} />
              <meshStandardMaterial
                color={color}
                roughness={path.style === "stone" ? 0.95 : 0.8}
                metalness={0}
              />
            </mesh>

            {/* Path stones/details for stone paths */}
            {path.style === "stone" && (() => {
              const stoneCount = Math.floor(length / 0.3);
              const stones = [];
              for (let j = 0; j < stoneCount; j++) {
                const t = (j + 0.5) / stoneCount;
                const sx = point.x + t * dx + (Math.random() - 0.5) * path.width * 0.3;
                const sz = point.y + t * dz + (Math.random() - 0.5) * path.width * 0.3;
                stones.push(
                  <mesh key={j} position={[sx, 0.02, sz]} rotation={[0, Math.random() * Math.PI, 0]} castShadow>
                    <boxGeometry args={[0.1 + Math.random() * 0.08, 0.03, 0.08 + Math.random() * 0.06]} />
                    <meshStandardMaterial color={`hsl(0, 0%, ${50 + Math.random() * 20}%)`} roughness={1} />
                  </mesh>
                );
              }
              return stones;
            })()}

            {/* Wood planks */}
            {path.style === "wood" && (() => {
              const plankCount = Math.floor(length / 0.2);
              const planks = [];
              for (let j = 0; j < plankCount; j++) {
                const t = (j + 0.5) / plankCount;
                const px = point.x + t * dx;
                const pz = point.y + t * dz;
                planks.push(
                  <mesh key={j} position={[px, 0.015, pz]} rotation={[-Math.PI / 2, 0, -angle + Math.PI / 2]} castShadow>
                    <boxGeometry args={[path.width * 0.95, 0.15, 0.025]} />
                    <meshStandardMaterial color={j % 2 === 0 ? "#8B4513" : "#A0522D"} roughness={0.85} />
                  </mesh>
                );
              }
              return planks;
            })()}
          </group>
        );
      })}
    </group>
  );
}

// ============ Fences ============

function Fence3D({ fence }: { fence: Fence }) {
  const fenceColors: Record<string, { post: string; rail: string }> = {
    wood: { post: "#5D3A1A", rail: "#8B5A2B" },
    metal: { post: "#333333", rail: "#4A4A4A" },
    hedge: { post: "#1D5A39", rail: "#228B22" },
    picket: { post: "#E8E8D0", rail: "#F5F5DC" },
  };

  const colors = fenceColors[fence.style] || fenceColors.wood;
  const dx = fence.endX - fence.startX;
  const dz = fence.endY - fence.startY;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);

  const postCount = Math.max(2, Math.floor(length / fence.postSpacing) + 1);

  return (
    <group>
      {/* Posts */}
      {Array.from({ length: postCount }).map((_, i) => {
        const t = postCount > 1 ? i / (postCount - 1) : 0;
        const px = fence.startX + t * dx;
        const pz = fence.startY + t * dz;

        if (fence.style === "hedge") {
          // Hedge: bushy spheres
          return (
            <group key={i} position={[px, 0, pz]}>
              <mesh position={[0, fence.height * 0.5, 0]} castShadow>
                <sphereGeometry args={[fence.height * 0.35, 8, 8]} />
                <meshStandardMaterial color={colors.rail} roughness={0.9} />
              </mesh>
              <mesh position={[0, fence.height * 0.3, 0]} castShadow>
                <sphereGeometry args={[fence.height * 0.3, 8, 8]} />
                <meshStandardMaterial color="#1A6B2E" roughness={0.9} />
              </mesh>
            </group>
          );
        }

        const postWidth = fence.style === "picket" ? 0.04 : 0.06;
        const postHeight = fence.style === "picket" ? fence.height * 1.1 : fence.height;

        return (
          <mesh key={i} position={[px, postHeight / 2, pz]} castShadow>
            <boxGeometry args={[postWidth, postHeight, postWidth]} />
            <meshStandardMaterial color={colors.post} roughness={0.7} />
          </mesh>
        );
      })}

      {/* Rails between posts */}
      {fence.style !== "hedge" && (
        <group>
          {/* Top rail */}
          <mesh
            position={[
              (fence.startX + fence.endX) / 2,
              fence.height * 0.85,
              (fence.startY + fence.endY) / 2,
            ]}
            rotation={[0, -angle, 0]}
            castShadow
          >
            <boxGeometry args={[0.03, 0.04, length]} />
            <meshStandardMaterial color={colors.rail} roughness={0.7} />
          </mesh>

          {/* Bottom rail */}
          <mesh
            position={[
              (fence.startX + fence.endX) / 2,
              fence.height * 0.35,
              (fence.startY + fence.endY) / 2,
            ]}
            rotation={[0, -angle, 0]}
            castShadow
          >
            <boxGeometry args={[0.03, 0.04, length]} />
            <meshStandardMaterial color={colors.rail} roughness={0.7} />
          </mesh>

          {/* Picket slats */}
          {fence.style === "picket" && (() => {
            const slatSpacing = 0.08;
            const slatCount = Math.floor(length / slatSpacing);
            return Array.from({ length: slatCount }).map((_, i) => {
              const t = (i + 0.5) / slatCount;
              const sx = fence.startX + t * dx;
              const sz = fence.startY + t * dz;
              return (
                <mesh key={`slat-${i}`} position={[sx, fence.height * 0.55, sz]} castShadow>
                  <boxGeometry args={[0.02, fence.height * 0.7, 0.01]} />
                  <meshStandardMaterial color={colors.rail} roughness={0.6} />
                </mesh>
              );
            });
          })()}
        </group>
      )}
    </group>
  );
}

// ============ Decorative Elements ============

function Butterflies({ width, height }: { width: number; height: number }) {
  const butterflies = useMemo(() => {
    return Array.from({ length: 3 }).map((_, i) => ({
      startX: Math.random() * width,
      startZ: Math.random() * height,
      speed: 0.3 + Math.random() * 0.3,
      radius: 1 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
      color: ["#FFD700", "#FF69B4", "#87CEEB"][i],
    }));
  }, [width, height]);

  return (
    <group>
      {butterflies.map((b, i) => (
        <Butterfly key={i} {...b} />
      ))}
    </group>
  );
}

function Butterfly({ startX, startZ, speed, radius, phase, color }: any) {
  const ref = useRef<THREE.Group>(null);
  const wingRef1 = useRef<THREE.Mesh>(null);
  const wingRef2 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.getElapsedTime() * speed + phase;
      ref.current.position.x = startX + Math.sin(t) * radius;
      ref.current.position.z = startZ + Math.cos(t * 0.7) * radius;
      ref.current.position.y = 1 + Math.sin(t * 2) * 0.3;
      ref.current.rotation.y = t + Math.PI / 2;
    }
    if (wingRef1.current && wingRef2.current) {
      const t = state.clock.getElapsedTime() * 8;
      wingRef1.current.rotation.y = Math.sin(t) * 0.7;
      wingRef2.current.rotation.y = -Math.sin(t) * 0.7;
    }
  });

  return (
    <group ref={ref}>
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.008, 0.03, 4, 4]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh ref={wingRef1} position={[0.02, 0, 0]}>
        <planeGeometry args={[0.04, 0.03]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.8} />
      </mesh>
      <mesh ref={wingRef2} position={[-0.02, 0, 0]}>
        <planeGeometry args={[0.04, 0.03]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

// Small decorative flowers in grass
function WildFlowers({ width, height }: { width: number; height: number }) {
  const flowers = useMemo(() => {
    const result = [];
    const count = Math.floor(width * height * 2);
    for (let i = 0; i < Math.min(count, 30); i++) {
      const side = Math.floor(Math.random() * 4);
      let x, z;
      const offset = 0.5 + Math.random() * 2;
      switch (side) {
        case 0: x = Math.random() * width; z = -offset; break;
        case 1: x = Math.random() * width; z = height + offset; break;
        case 2: x = -offset; z = Math.random() * height; break;
        default: x = width + offset; z = Math.random() * height; break;
      }
      result.push({
        position: [x, 0, z] as [number, number, number],
        color: ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#FF6B9D", "#C084FC"][Math.floor(Math.random() * 6)],
        height: 0.08 + Math.random() * 0.1,
      });
    }
    return result;
  }, [width, height]);

  return (
    <group>
      {flowers.map((f, i) => (
        <group key={i} position={f.position}>
          <mesh position={[0, f.height / 2, 0]}>
            <cylinderGeometry args={[0.003, 0.003, f.height, 4]} />
            <meshStandardMaterial color="#2D5016" />
          </mesh>
          <mesh position={[0, f.height, 0]}>
            <sphereGeometry args={[0.025, 6, 6]} />
            <meshStandardMaterial color={f.color} emissive={f.color} emissiveIntensity={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ============ Grid Overlay ============

function GridLines({ width, height }: { width: number; height: number }) {
  const lines = useMemo(() => {
    const positions = [];
    // Vertical lines
    for (let x = 0; x <= width; x += 1) {
      positions.push(x, 0.005, 0, x, 0.005, height);
    }
    // Horizontal lines
    for (let z = 0; z <= height; z += 1) {
      positions.push(0, 0.005, z, width, 0.005, z);
    }
    return new Float32Array(positions);
  }, [width, height]);

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={lines.length / 3}
          array={lines}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#000000" transparent opacity={0.08} />
    </lineSegments>
  );
}

// ============ Scene ============

function Scene({
  plantings,
  plots,
  grassAreas,
  paths,
  fences,
  width,
  height,
  onPlantClick,
}: Garden3DProps) {
  const { getPlantById } = useCatalogStore();

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[width / 2, 6, height + 4]}
        fov={45}
      />
      <OrbitControls
        target={[width / 2, 0, height / 2]}
        maxPolarAngle={Math.PI / 2.05}
        minPolarAngle={0.1}
        minDistance={2}
        maxDistance={20}
        enablePan={true}
        panSpeed={0.5}
        enableDamping
        dampingFactor={0.05}
      />

      {/* Sky */}
      <Sky
        distance={450000}
        sunPosition={[5, 15, 5]}
        inclination={0.49}
        azimuth={0.25}
        rayleigh={0.5}
      />
      <fog attach="fog" args={["#E8F4FD", 15, 40]} />

      {/* Lighting */}
      <SunLight width={width} height={height} />

      {/* Clouds */}
      <Clouds3D width={width} height={height} />

      {/* Ground */}
      <BaseGround width={width} height={height} />
      <GardenSoil width={width} height={height} />
      <GrassTufts width={width} height={height} />
      <GridLines width={width} height={height} />

      {/* Grass Areas */}
      {grassAreas.map((grass) => (
        <GrassArea3D key={grass.id} grass={grass} />
      ))}

      {/* Paths */}
      {paths.map((path) => (
        <Path3D key={path.id} path={path} />
      ))}

      {/* Fences */}
      {fences.map((fence) => (
        <Fence3D key={fence.id} fence={fence} />
      ))}

      {/* Plot beds */}
      {plots.map((plot) => (
        <PlotBed key={plot.id} plot={plot} />
      ))}

      {/* Plants */}
      {plantings.map((planting) => {
        const plant = getPlantById(planting.plantId);
        // Find plot for this planting to get bed height
        const plot = plots.find((p) => p.id === planting.plotId);
        const plotHeight = plot ? 0.15 : 0;

        return (
          <PlantMarker
            key={planting.id}
            planting={planting}
            emoji={plant?.emoji || "🌱"}
            plotHeight={plotHeight}
            onClick={() => onPlantClick?.(planting)}
          />
        );
      })}

      {/* Decorative elements */}
      <WildFlowers width={width} height={height} />
      <Butterflies width={width} height={height} />
    </>
  );
}

// ============ Loading ============

function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent" />
          <span className="absolute inset-0 flex items-center justify-center text-xl">🌱</span>
        </div>
        <span className="text-sm font-medium text-green-700 bg-white/80 px-3 py-1 rounded-full">
          Chargement du jardin...
        </span>
      </div>
    </Html>
  );
}

// ============ Main Component ============

export function Garden3D({
  plantings,
  plots = [],
  grassAreas = [],
  paths = [],
  fences = [],
  width = 4,
  height = 3,
  onPlantClick,
}: Garden3DProps) {
  return (
    <div className="w-full h-full rounded-lg overflow-hidden">
      <Canvas
        shadows
        className="touch-none"
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        dpr={[1, 2]}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Scene
            plantings={plantings}
            plots={plots}
            grassAreas={grassAreas}
            paths={paths}
            fences={fences}
            width={width}
            height={height}
            onPlantClick={onPlantClick}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

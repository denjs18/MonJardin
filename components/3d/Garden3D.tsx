"use client";

import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  Html,
  Text,
  Environment,
} from "@react-three/drei";
import * as THREE from "three";
import { Planting, PlantStatus } from "@/lib/types";
import { useCatalogStore, useUIStore } from "@/lib/store";
import { getStatusColor } from "@/lib/growthEngine";

interface Garden3DProps {
  plantings: Planting[];
  width: number;
  height: number;
  onPlantClick?: (planting: Planting) => void;
}

function Ground({ width, height }: { width: number; height: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[width / 2, 0, height / 2]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial color="#8B6914" opacity={0.8} transparent />
    </mesh>
  );
}

function GrassEdge({ width, height }: { width: number; height: number }) {
  const edgeWidth = 0.5;
  return (
    <>
      {/* Top edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[width / 2, -0.01, -edgeWidth / 2]}>
        <planeGeometry args={[width + edgeWidth * 2, edgeWidth]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
      {/* Bottom edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[width / 2, -0.01, height + edgeWidth / 2]}>
        <planeGeometry args={[width + edgeWidth * 2, edgeWidth]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
      {/* Left edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-edgeWidth / 2, -0.01, height / 2]}>
        <planeGeometry args={[edgeWidth, height]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
      {/* Right edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[width + edgeWidth / 2, -0.01, height / 2]}>
        <planeGeometry args={[edgeWidth, height]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
    </>
  );
}

interface PlantMarkerProps {
  planting: Planting;
  emoji: string;
  onClick?: () => void;
}

function PlantMarker({ planting, emoji, onClick }: PlantMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const statusColor = getStatusColor(planting.status);
  const scale = planting.growthStage / 100;
  const height = 0.1 + scale * 0.4;

  useFrame((state) => {
    if (meshRef.current && hovered) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 2;
    }
  });

  return (
    <group position={[planting.position.x, 0, planting.position.y]}>
      {/* Base cylinder */}
      <mesh
        ref={meshRef}
        position={[0, height / 2, 0]}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[0.1, 0.15, height, 8]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={hovered ? statusColor : "#000000"}
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </mesh>

      {/* Top sphere for fruits/vegetables */}
      {planting.status === "flowering" || planting.status === "ready" ? (
        <mesh position={[0, height + 0.1, 0]}>
          <sphereGeometry args={[0.08 + scale * 0.05, 8, 8]} />
          <meshStandardMaterial
            color={planting.status === "ready" ? "#FF8C00" : "#FFD700"}
          />
        </mesh>
      ) : null}

      {/* Emoji label */}
      <Html position={[0, height + 0.3, 0]} center>
        <div
          className={`text-2xl cursor-pointer transition-transform ${
            hovered ? "scale-125" : ""
          }`}
          onClick={onClick}
        >
          {emoji}
        </div>
      </Html>

      {/* Name label on hover */}
      {hovered && (
        <Html position={[0, height + 0.5, 0]} center>
          <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            {planting.plantName}
            <br />
            <span className="text-green-400">{planting.growthStage}%</span>
          </div>
        </Html>
      )}
    </group>
  );
}

function GridLines({ width, height }: { width: number; height: number }) {
  const gridSize = 0.5; // 50cm grid
  const lines = [];

  // Vertical lines
  for (let x = 0; x <= width; x += gridSize) {
    lines.push(
      <line key={`v-${x}`}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([x, 0.01, 0, x, 0.01, height]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#666" opacity={0.3} transparent />
      </line>
    );
  }

  // Horizontal lines
  for (let y = 0; y <= height; y += gridSize) {
    lines.push(
      <line key={`h-${y}`}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0.01, y, width, 0.01, y]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#666" opacity={0.3} transparent />
      </line>
    );
  }

  return <>{lines}</>;
}

function Scene({
  plantings,
  width,
  height,
  onPlantClick,
}: Garden3DProps) {
  const { getPlantById } = useCatalogStore();

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[width / 2, 5, height + 3]}
        fov={50}
      />
      <OrbitControls
        target={[width / 2, 0, height / 2]}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={2}
        maxDistance={15}
        enablePan={true}
        panSpeed={0.5}
      />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Garden elements */}
      <Ground width={width} height={height} />
      <GrassEdge width={width} height={height} />
      <GridLines width={width} height={height} />

      {/* Plants */}
      {plantings.map((planting) => {
        const plant = getPlantById(planting.plantId);
        return (
          <PlantMarker
            key={planting.id}
            planting={planting}
            emoji={plant?.emoji || "🌱"}
            onClick={() => onPlantClick?.(planting)}
          />
        );
      })}
    </>
  );
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Chargement 3D...</span>
      </div>
    </Html>
  );
}

export function Garden3D({
  plantings,
  width = 4,
  height = 3,
  onPlantClick,
}: Garden3DProps) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-sky-200 to-sky-100 dark:from-sky-900 dark:to-sky-800 rounded-lg overflow-hidden">
      <Canvas shadows className="touch-none">
        <Suspense fallback={<LoadingFallback />}>
          <Scene
            plantings={plantings}
            width={width}
            height={height}
            onPlantClick={onPlantClick}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

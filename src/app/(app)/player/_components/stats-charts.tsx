"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const TICK = {
  font: { family: "Inter, sans-serif", size: 11 as const },
  color: "#6b7280",
};

export function TriesBarChart({
  data,
}: {
  data: { label: string; tries: number }[];
}) {
  return (
    <Bar
      data={{
        labels: data.map((d) => d.label),
        datasets: [
          {
            label: "Tries",
            data: data.map((d) => d.tries),
            backgroundColor: "#ffba20",
            borderColor: "#00241a",
            borderWidth: 2,
            borderRadius: 2,
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: TICK },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { ...TICK, stepSize: 1 },
          },
        },
      }}
    />
  );
}

export function ReliabilityLineChart({
  data,
}: {
  data: { label: string; score: number }[];
}) {
  return (
    <Line
      data={{
        labels: data.map((d) => d.label),
        datasets: [
          {
            label: "Reliability",
            data: data.map((d) => d.score),
            borderColor: "#ffba20",
            backgroundColor: "rgba(255,186,32,0.08)",
            borderWidth: 2,
            pointBackgroundColor: "#ffba20",
            pointRadius: 4,
            fill: true,
            tension: 0.3,
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: TICK },
          y: {
            min: 0,
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: TICK,
          },
        },
      }}
    />
  );
}

export function AttendanceDoughnut({
  attended,
  total,
}: {
  attended: number;
  total: number;
}) {
  const missed = Math.max(0, total - attended);
  return (
    <Doughnut
      data={{
        labels: ["Attended", "Missed"],
        datasets: [
          {
            data: [attended === 0 && missed === 0 ? 1 : attended, missed],
            backgroundColor: ["#ffba20", "#e5e7eb"],
            borderColor: ["#00241a", "#e5e7eb"],
            borderWidth: 2,
          },
        ],
      }}
      options={{
        cutout: "70%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { ...TICK, padding: 12 },
          },
        },
      }}
    />
  );
}

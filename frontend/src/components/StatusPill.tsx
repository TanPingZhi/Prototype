import React from "react";
import { Tone } from "../types";

type StatusPillProps = {
  tone: Tone;
  children: React.ReactNode;
};

export const StatusPill: React.FC<StatusPillProps> = ({ tone, children }) => (
  <span className={`pill ${tone}`}>{children}</span>
);
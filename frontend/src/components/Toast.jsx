import React from "react";
import { CheckIcon, SparklesIcon } from "./Icons";

export default function Toast({ message, type = "success" }) {
  if (!message) return null;

  return (
    <div className="toast-container">
      <div className={`toast ${type}`}>
        {type === "success" ? <CheckIcon size={18} /> : <SparklesIcon size={18} />}
        <span>{message}</span>
      </div>
    </div>
  );
}

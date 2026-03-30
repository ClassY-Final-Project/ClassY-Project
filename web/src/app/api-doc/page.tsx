"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

// SwaggerUI uses some browser specific APIs that might cause SSR issues, so we import it dynamically
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocPage() {
  return (
    <div className="container mx-auto my-10 p-5 bg-white rounded-lg shadow-lg">
      <SwaggerUI url="/api/swagger" />
    </div>
  );
}

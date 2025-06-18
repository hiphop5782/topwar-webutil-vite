import { useEffect, useRef } from "react";

const UtterancesComments = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const script = document.createElement("script");

    script.src = "https://utteranc.es/client.js";
    script.setAttribute("repo", "hiphop5782/topwar-webutil-comments");
    script.setAttribute("issue-number", "1"); // 모든 댓글이 여기에 모임
    script.setAttribute("theme", "github-light");
    script.crossOrigin = "anonymous";
    script.async = true;

    if (containerRef.current) {
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(script);
    }
  }, []);

  return <div ref={containerRef} />;
};

export default UtterancesComments;

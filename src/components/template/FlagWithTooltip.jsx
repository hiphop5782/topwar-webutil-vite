import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css'; // 기본 스타일
import { useEffect, useRef } from 'react';

export default function FlagWithTooltip({ lang, selected=false, onClick }) {
  const flagRef = useRef();

  useEffect(() => {
    if (flagRef.current) {
      tippy(flagRef.current, {
        content: lang.name, // 툴팁 내용
        placement: 'top',    // 위치 (top, bottom, left, right)
        duration: 0,          // [핵심] 나타나고 사라지는 시간을 0ms로 설정
        delay: [0, 0],        // [핵심] 마우스를 올릴 때와 뗄 때 대기 시간 제거
        animation: false,     // 애니메이션 효과 끄기
        theme: 'light',      // 테마 설정 
      });
    }
  }, [lang]);

  return (
    <span ref={flagRef} className={`fi fi-${lang.flag} ${selected ? "border border-primary" : "border border-white"}`} style={{cursor:"pointer"}} onClick={onClick}></span>
  );
}
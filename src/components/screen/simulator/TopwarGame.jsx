import React, { useRef, useEffect, useState } from 'react';

// 보내주신 캐릭터 이미지 (이미지 객체로 변환하여 사용)
const CHARACTER_IMG_URL = "https://i.ibb.co/m0fXmX8/image-7a522e.png"; 

const TopwarGame = () => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(1);
  const [gameState, setGameState] = useState('playing');
  const playerImg = useRef(null);

  const gameData = useRef({
    playerX: 200,     
    objects: [],      
    projectiles: [],  
    frame: 0,
    lastShotTime: 0,
    elapsedTime: 0,   // 배경 애니메이션용
  });

  useEffect(() => {
    const img = new Image();
    img.src = CHARACTER_IMG_URL;
    img.onload = () => { playerImg.current = img; };

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // 3D -> 2D 변환 핵심 함수 (지평선으로 모이는 원근법)
    const project = (x3d, y3d, z3d) => {
      // z3d가 0이면 플레이어 위치, 클수록 멀어짐
      const viewDistance = 300; 
      const scale = viewDistance / (viewDistance + z3d); 
      
      // 화면 중앙(지평선)을 기준으로 좌표 변환
      const horizonY = canvas.height * 0.45; // 지평선 높이
      return {
        x: (canvas.width / 2) + x3d * scale,
        y: horizonY + y3d * scale,
        scale: scale
      };
    };

    const spawnObject = () => {
      if (gameData.current.objects.length > 10) return;
      const isGate = Math.random() > 0.4;
      gameData.current.objects.push({
        x: Math.random() * 600 - 300, // 좌우 폭 확대
        y: 200, // 땅 높이
        z: 2000, // 저 멀리서 생성
        type: isGate ? 'gate' : 'enemy',
        value: 1,
        hp: 5,
        width: isGate ? 300 : 100,
        height: isGate ? 200 : 150
      });
    };

    const update = (timestamp) => {
      if (gameState !== 'playing') return;
      const state = gameData.current;
      state.frame++;
      state.elapsedTime += 10; 

      // 1. 미사일 발사 (지평선 중심점을 향해 날아감)
      if (timestamp - state.lastShotTime > 333) {
        const bulletCount = Math.min(Math.ceil(score / 10) + 1, 10);
        for (let i = 0; i < bulletCount; i++) {
          const offsetX = (i - (bulletCount - 1) / 2) * 20;
          state.projectiles.push({
            x: (state.playerX - canvas.width / 2) + offsetX,
            y: 150, // 발사 높이
            z: 0,   // 시작 깊이
            speed: 30
          });
        }
        state.lastShotTime = timestamp;
      }

      // 2. 미사일 이동 및 충돌
      state.projectiles.forEach((p, pIdx) => {
        p.z += p.speed;
        if (p.z > 2000) state.projectiles.splice(pIdx, 1);

        state.objects.forEach(obj => {
          if (Math.abs(p.z - obj.z) < 100 && Math.abs(p.x - obj.x) < obj.width / 2) {
            if (obj.type === 'gate') obj.value += 1;
            else obj.hp -= 1;
            state.projectiles.splice(pIdx, 1);
          }
        });
      });

      // 3. 오브젝트 이동 및 플레이어 충돌
      if (state.frame % 60 === 0) spawnObject();
      state.objects.forEach((obj, idx) => {
        obj.z -= 15; // 다가오는 속도
        
        // 플레이어 위치(z=0 근처) 충돌 판정
        if (obj.z < 50 && obj.z > -50) {
          const p3X = state.playerX - canvas.width / 2;
          if (Math.abs(p3X - obj.x) < obj.width / 2) {
            if (obj.type === 'gate') setScore(s => s + obj.value);
            else setScore(s => (s - 10 <= 0 ? (setGameState('gameOver'), 0) : s - 10));
            state.objects.splice(idx, 1);
          }
        }
        if (obj.z < -200) state.objects.splice(idx, 1);
      });
      state.objects = state.objects.filter(o => o.type === 'gate' || o.hp > 0);

      draw();
      animationFrameId = requestAnimationFrame(update);
    };

    const draw = () => {
      const state = gameData.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // --- 3D 배경 (도로 및 네온) ---
      const horizonY = canvas.height * 0.45;
      
      // 1. 하늘 & 바닥 분리
      ctx.fillStyle = '#050010'; // 우주 배경
      ctx.fillRect(0, 0, canvas.width, horizonY);
      ctx.fillStyle = '#111'; // 도로 바닥
      ctx.fillRect(0, horizonY, canvas.width, canvas.height - horizonY);

      // 2. 네온 도로 라인 (움직이는 효과)
      ctx.strokeStyle = '#00f2ff';
      ctx.lineWidth = 2;
      for (let i = -5; i <= 5; i++) {
        const pStart = project(i * 150, 200, 0);
        const pEnd = project(i * 50, 200, 2000);
        ctx.beginPath();
        ctx.moveTo(pStart.x, pStart.y);
        ctx.lineTo(pEnd.x, pEnd.y);
        ctx.stroke();
      }

      // 가로 그리드 (속도감 표현)
      ctx.strokeStyle = '#ff00ff22';
      for (let z = 0; z < 2000; z += 200) {
        const moveZ = (z - (state.elapsedTime % 200));
        const pLeft = project(-1000, 200, moveZ);
        const pRight = project(1000, 200, moveZ);
        ctx.beginPath();
        ctx.moveTo(0, pLeft.y);
        ctx.lineTo(canvas.width, pRight.y);
        ctx.stroke();
      }

      // --- 오브젝트 렌더링 ---
      [...state.objects].sort((a, b) => b.z - a.z).forEach(obj => {
        const p = project(obj.x, obj.y, obj.z);
        if (p.scale < 0.1) return;

        const w = obj.width * p.scale;
        const h = obj.height * p.scale;

        if (obj.type === 'gate') {
          ctx.fillStyle = '#22c55e88';
          ctx.fillRect(p.x - w/2, p.y - h, w, h);
          ctx.strokeStyle = '#22c55e';
          ctx.strokeRect(p.x - w/2, p.y - h, w, h);
          ctx.fillStyle = 'white';
          ctx.font = `bold ${Math.floor(40 * p.scale)}px Arial`;
          ctx.fillText(`+${obj.value}`, p.x - 10, p.y - h/2);
        } else {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(p.x - w/2, p.y - h, w, h);
        }
      });

      // --- 미사일 렌더링 (원근법 적용) ---
      state.projectiles.forEach(pr => {
        const p = project(pr.x, pr.y, pr.z);
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6 * p.scale, 0, Math.PI * 2);
        ctx.fill();
      });

      // --- 플레이어 캐릭터 (2D 하단 고정) ---
      if (playerImg.current) {
        const pW = 140;
        const pH = 180;
        ctx.drawImage(playerImg.current, state.playerX - pW/2, canvas.height - pH - 20, pW, pH);
      }

      // UI
      ctx.fillStyle = "white";
      ctx.font = "bold 24px Orbitron, Arial";
      ctx.fillText(`ARMY: ${score}`, 20, 40);
    };

    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, score]);

  return (
    <div style={{ position: 'relative', width: '400px', margin: '0 auto', overflow: 'hidden' }}>
      <canvas 
        ref={canvasRef} width={400} height={600} 
        onMouseMove={(e) => {
          const rect = canvasRef.current.getBoundingClientRect();
          gameData.current.playerX = e.clientX - rect.left;
        }}
        style={{ background: '#000', cursor: 'none', display: 'block' }} 
      />
      {gameState !== 'playing' && (
        <div style={overlayStyle}>
          <h1>{gameState === 'victory' ? 'MISSION CLEAR' : 'GAME OVER'}</h1>
          <button onClick={() => window.location.reload()} style={btnStyle}>RESTART</button>
        </div>
      )}
    </div>
  );
};

const overlayStyle = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.9)', color: '#00f2ff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' };
const btnStyle = { padding: '15px 40px', background: '#00f2ff', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' };

export default TopwarGame;
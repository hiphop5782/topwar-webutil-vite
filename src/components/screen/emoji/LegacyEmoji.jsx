import { useCallback, useEffect, useState } from "react";
import "./LegacyEmoji.css";

const backgroundColors = [
    'transparent', '#ffffff', '#bacee0', '#677bac', '#9dcdb8', '#51a5a0', '#9bb157',
    '#f8cd59', '#f99460', '#f68181', '#f7a2bd', '#5b4d49',
    '#d3d5d0', '#525252', '#404372', '#10374a', '#818b9c'
];

const LegacyEmoji = () => {
    const [images] = useState(Array.from({ length: 111 }, (_, index) => index + 1));
    const [emoji, setEmoji] = useState(1);
    const [backgroundColor, setBackgroundColor] = useState('#bacee0');
    const [recentEmoji, setRecentEmoji] = useState([]);

    useEffect(()=>{
        try {
            copyToClipboard();
            setRecentEmoji(prev=>[emoji, ...prev.filter(em=>em !== emoji)]);
        }
        catch(e){
            console.error("copy image error");
        }
    }, [backgroundColor, emoji]);

    const copyToClipboard = useCallback(async () => {
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous'; // CORS 이슈 방지
            img.src = `${import.meta.env.VITE_PUBLIC_URL}/images/emoji/${emoji}.png`;

            img.onload = async () => {
                const canvas = document.createElement('canvas');
                canvas.width = 100;
                canvas.height = 100;
                const ctx = canvas.getContext('2d');

                // 배경색 설정 (투명 배경 대신 사용)
                ctx.fillStyle = backgroundColor;
                //console.log(ctx.fillStyle);
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height); // 투명 배경을 유지하며 그리기

                canvas.toBlob(async (blob) => {
                    if (blob) {
                        try {
                            const clipboardItem = new ClipboardItem({ 'image/png': blob });
                            await navigator.clipboard.write([clipboardItem]);
                            //alert('이미지가 클립보드에 복사되었습니다!');
                        } catch (error) {
                            console.error('클립보드에 이미지 복사 실패:', error);
                        }
                    } else {
                        console.error('Blob 생성 실패');
                    }
                }, 'image/png'); // PNG 형식으로 Blob 생성
            };

            img.onerror = (error) => {
                console.error('이미지 로드 실패:', error);
            };
        } catch (error) {
            console.error('이미지를 클립보드에 복사하는 중 오류 발생:', error);
        }
    }, [backgroundColor, emoji]);

    return (<>
        <div className="row">
            <div className="col">
                <h1>탑워 이모티콘</h1>
                <hr></hr>
                <p>클릭하면 복사되며 원하는 곳에 ctrl+v 하세요!</p>
            </div>
        </div>

        <div className="row mt-4">
            <div className="col">
                <h4>최근 사용한 이모티콘</h4>
                {recentEmoji.map(imageNo => (
                    <img className={`topwar-emoji${emoji === imageNo ? ' on':''}`} src={`${import.meta.env.VITE_PUBLIC_URL}/images/emoji/${imageNo}.png`}
                        width={25} height={25} key={imageNo}
                        onClick={e => setEmoji(imageNo)} />
                ))}
            </div>
        </div>

        <div className="row mt-4">
            <div className="col">
                <h4>배경색 선택(ex : 카카오톡 대화창 배경색)</h4>
                {backgroundColors.map((color, index)=>(
                <div className={`color-palette${color === backgroundColor ? ' on' : ''}`} style={{backgroundColor:color}}
                    key={index} onClick={e=>setBackgroundColor(color)}>{color === 'transparent' && <span>투명</span>}</div>
                ))}
            </div>
        </div>

        <div className="row mt-4">
            <div className="col">
                <h4>이모티콘 선택</h4>
                {images.map(imageNo => (
                    <img className={`topwar-emoji${emoji === imageNo ? ' on':''}`} src={`${import.meta.env.VITE_PUBLIC_URL}/images/emoji/${imageNo}.png`}
                        width={50} height={50} key={imageNo}
                        onClick={e => setEmoji(imageNo)} />
                ))}
            </div>
        </div>
    </>);
};

export default LegacyEmoji;
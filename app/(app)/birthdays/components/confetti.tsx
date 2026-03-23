'use client';

import { useEffect, useState } from 'react';

const ConfettiPiece = ({ x, y, angle, speed, color }: { x: number, y: number, angle: number, speed: number, color: string }) => {
    return (
        <div
            className="absolute w-2 h-4"
            style={{
                left: `${x}%`,
                top: `${y}px`,
                backgroundColor: color,
                transform: `rotate(${angle}deg)`,
                animation: `fall ${speed}s linear forwards`,
            }}
        />
    );
};

export function Confetti() {
    const [pieces, setPieces] = useState<any[]>([]);

    useEffect(() => {
        const newPieces = Array.from({ length: 100 }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * -500, // Start above the screen
            angle: Math.random() * 360,
            speed: Math.random() * 2 + 3, // Fall speed between 3 and 5 seconds
            color: `hsl(${Math.random() * 360}, 90%, 60%)`,
        }));
        setPieces(newPieces);

        const styleSheet = document.createElement("style");
        styleSheet.innerText = `
            @keyframes fall {
                to {
                    top: 120vh;
                    transform: rotate(720deg);
                }
            }
        `;
        document.head.appendChild(styleSheet);

        return () => {
            document.head.removeChild(styleSheet);
        }
    }, []);

    return (
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-50 overflow-hidden">
            {pieces.map(piece => (
                <ConfettiPiece key={piece.id} {...piece} />
            ))}
        </div>
    );
};

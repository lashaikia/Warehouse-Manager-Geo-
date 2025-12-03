import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, RefreshCw, Trophy, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface SnakeGameProps {
  onClose: () => void;
}

const GRID_SIZE = 20;
const CELL_SIZE = 20; // px
const INITIAL_SPEED = 150;

type Point = { x: number; y: number };

export const SnakeGame: React.FC<SnakeGameProps> = ({ onClose }) => {
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 15, y: 5 });
  const [direction, setDirection] = useState<Point>({ x: 0, y: 0 }); // Start static
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('snake_highscore') || '0'));
  const [isPlaying, setIsPlaying] = useState(false);

  // Refs for mutable state in event listeners
  const directionRef = useRef(direction);
  const speedRef = useRef(INITIAL_SPEED);

  const generateFood = useCallback((): Point => {
    return {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  }, []);

  const startGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setFood(generateFood());
    setDirection({ x: 1, y: 0 });
    directionRef.current = { x: 1, y: 0 };
    setGameOver(false);
    setScore(0);
    setIsPlaying(true);
    speedRef.current = INITIAL_SPEED;
  };

  const changeDirection = (newDir: Point) => {
    // Prevent reversing
    if (newDir.x !== 0 && directionRef.current.x !== 0) return;
    if (newDir.y !== 0 && directionRef.current.y !== 0) return;
    
    setDirection(newDir);
    directionRef.current = newDir;
    
    if (!isPlaying && !gameOver) setIsPlaying(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': changeDirection({ x: 0, y: -1 }); break;
        case 'ArrowDown': changeDirection({ x: 0, y: 1 }); break;
        case 'ArrowLeft': changeDirection({ x: -1, y: 0 }); break;
        case 'ArrowRight': changeDirection({ x: 1, y: 0 }); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver]);

  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const moveSnake = setInterval(() => {
      setSnake((prevSnake) => {
        const newHead = {
          x: prevSnake[0].x + directionRef.current.x,
          y: prevSnake[0].y + directionRef.current.y,
        };

        // Check Wall Collision
        if (
          newHead.x < 0 || 
          newHead.x >= GRID_SIZE || 
          newHead.y < 0 || 
          newHead.y >= GRID_SIZE
        ) {
          setGameOver(true);
          return prevSnake;
        }

        // Check Self Collision
        if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          setGameOver(true);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Check Food
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore(s => {
            const newScore = s + 1;
            if (newScore > highScore) {
              setHighScore(newScore);
              localStorage.setItem('snake_highscore', newScore.toString());
            }
            return newScore;
          });
          setFood(generateFood());
          // Speed up slightly
          speedRef.current = Math.max(50, speedRef.current - 2);
        } else {
          newSnake.pop(); // Remove tail
        }

        return newSnake;
      });
    }, speedRef.current);

    return () => clearInterval(moveSnake);
  }, [isPlaying, gameOver, food, highScore, generateFood]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 p-6 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700 flex flex-col items-center relative">
        
        {/* Header */}
        <div className="w-full flex justify-between items-center mb-4">
          <div className="flex items-center text-yellow-400">
            <Trophy size={20} className="mr-2" />
            <span className="font-bold text-xl">{score}</span>
            <span className="text-xs text-gray-500 ml-2">HI: {highScore}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        {/* Game Board */}
        <div 
          className="relative bg-black border-2 border-gray-700 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(34,197,94,0.3)]"
          style={{ width: GRID_SIZE * CELL_SIZE, height: GRID_SIZE * CELL_SIZE }}
        >
          {/* Snake */}
          {snake.map((segment, i) => (
            <div
              key={i}
              className="absolute bg-green-500 rounded-sm"
              style={{
                left: segment.x * CELL_SIZE,
                top: segment.y * CELL_SIZE,
                width: CELL_SIZE - 2,
                height: CELL_SIZE - 2,
                opacity: i === 0 ? 1 : 0.6 // Head is darker
              }}
            />
          ))}
          {/* Food */}
          <div
            className="absolute bg-red-500 rounded-full animate-pulse"
            style={{
              left: food.x * CELL_SIZE,
              top: food.y * CELL_SIZE,
              width: CELL_SIZE - 2,
              height: CELL_SIZE - 2,
            }}
          />

          {/* Overlays */}
          {!isPlaying && !gameOver && (
             <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 text-white font-bold cursor-pointer" onClick={startGame}>
                დააჭირე დასაწყებად
             </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900 bg-opacity-80 text-white z-10 animate-fade-in">
               <h3 className="text-3xl font-bold mb-2">Game Over!</h3>
               <p className="mb-4">Score: {score}</p>
               <button 
                 onClick={startGame}
                 className="flex items-center px-4 py-2 bg-white text-red-900 rounded-full font-bold hover:scale-105 transition"
               >
                 <RefreshCw size={18} className="mr-2" />
                 თავიდან
               </button>
            </div>
          )}
        </div>

        {/* Controls (Mobile Friendly) */}
        <div className="mt-6 grid grid-cols-3 gap-2 w-40">
           <div></div>
           <button 
             className="bg-gray-800 p-3 rounded-lg text-white hover:bg-gray-700 active:bg-gray-600 transition flex justify-center"
             onClick={() => changeDirection({ x: 0, y: -1 })}
           >
             <ChevronUp />
           </button>
           <div></div>
           
           <button 
             className="bg-gray-800 p-3 rounded-lg text-white hover:bg-gray-700 active:bg-gray-600 transition flex justify-center"
             onClick={() => changeDirection({ x: -1, y: 0 })}
           >
             <ChevronLeft />
           </button>
           <button 
             className="bg-gray-800 p-3 rounded-lg text-white hover:bg-gray-700 active:bg-gray-600 transition flex justify-center"
             onClick={() => changeDirection({ x: 0, y: 1 })}
           >
             <ChevronDown />
           </button>
           <button 
             className="bg-gray-800 p-3 rounded-lg text-white hover:bg-gray-700 active:bg-gray-600 transition flex justify-center"
             onClick={() => changeDirection({ x: 1, y: 0 })}
           >
             <ChevronRight />
           </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-4">გამოიყენეთ კლავიატურა ან ღილაკები</p>

      </div>
    </div>
  );
};
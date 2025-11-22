import React from 'react';

interface BlockSelectorProps {
  selectedBlock: number | null;
  onSelectBlock: (block: number) => void;
  totalBlocks?: number;
}

const BlockSelector: React.FC<BlockSelectorProps> = ({ selectedBlock, onSelectBlock, totalBlocks = 10 }) => {
  const blocks = Array.from({ length: totalBlocks }, (_, i) => i + 1);

  return (
    <div className="block-selector-container">
      <div className="block-grid">
        {blocks.map(block => (
          <button
            key={block}
            className={`block-button ${selectedBlock === block ? 'selected' : ''}`}
            onClick={() => onSelectBlock(block)}
          >
            {block}
          </button>
        ))}
      </div>

      <style jsx>{`
        .block-selector-container {
          margin-bottom: 1.5rem;
        }
        
        .block-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.75rem;
        }
        
        .block-button {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 3.5rem;
          background-color: white;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        
        .block-button:hover {
          background-color: #f8fafc;
          border-color: #cbd5e1;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          color: #334155;
        }
        
        .block-button.selected {
          background-color: #10b981;
          border-color: #059669;
          color: white;
          box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4);
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
};

export default BlockSelector; 
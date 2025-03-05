import React from 'react';

interface BlockSelectorProps {
  selectedBlock: number | null;
  onSelectBlock: (block: number) => void;
}

const BlockSelector: React.FC<BlockSelectorProps> = ({ selectedBlock, onSelectBlock }) => {
  const blocks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  
  return (
    <div className="block-selector-container">
      <h3 className="block-selector-title">Block Number:</h3>
      
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
        
        .block-selector-title {
          margin: 0 0 0.75rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }
        
        .block-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.5rem;
        }
        
        .block-button {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 3rem;
          background-color: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          font-size: 1.125rem;
          font-weight: 500;
          color: #111827;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .block-button:hover {
          background-color: #f9fafb;
        }
        
        .block-button.selected {
          background-color: #d1fae5;
          border-color: #10b981;
          color: #047857;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default BlockSelector; 
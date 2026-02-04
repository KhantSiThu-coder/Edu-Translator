
import React from 'react';
import { JapaneseSegment } from '../types';

interface FuriganaTextProps {
  segments: JapaneseSegment[];
  fontSize?: string;
}

export const FuriganaText: React.FC<FuriganaTextProps> = ({ segments, fontSize = "text-xl" }) => {
  return (
    <div className={`leading-loose font-jp ${fontSize}`}>
      {segments.map((segment, index) => (
        <span key={index} className="inline-block mr-0.5">
          {segment.ruby ? (
            <ruby>
              {segment.text}
              <rt>{segment.ruby}</rt>
            </ruby>
          ) : (
            segment.text
          )}
        </span>
      ))}
    </div>
  );
};

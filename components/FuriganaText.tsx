
import React from 'react';
import { PhoneticSegment } from '../types';

interface PhoneticTextProps {
  segments: PhoneticSegment[];
  fontSize?: string;
  langClass?: string;
}

export const PhoneticText: React.FC<PhoneticTextProps> = ({ 
  segments, 
  fontSize = "text-xl",
  langClass = "font-jp"
}) => {
  return (
    <div className={`leading-loose ${langClass} ${fontSize}`}>
      {segments.map((segment, index) => (
        <span key={index} className="inline-block mr-0.5">
          {segment.ruby ? (
            <ruby>
              {segment.text}
              <rt className="text-[0.6em] text-slate-400 font-sans">{segment.ruby}</rt>
            </ruby>
          ) : (
            segment.text
          )}
        </span>
      ))}
    </div>
  );
};

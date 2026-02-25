import React from 'react';
import { Text, View, TextStyle, StyleProp, StyleSheet } from 'react-native';

interface HighlightedTextProps {
  text: string;
  searchQuery: string;
  highlightIndex?: number;
  baseStyle?: StyleProp<TextStyle>;
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  searchQuery,
  highlightIndex,
  baseStyle,
}) => {
  if (!searchQuery || !searchQuery.trim()) {
    return <Text style={baseStyle}>{text}</Text>;
  }

  const query = searchQuery.trim();
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const flatStyle = StyleSheet.flatten(baseStyle) || {};

  // Web: use real HTML mark tags via dangerouslySetInnerHTML
  const isWeb = typeof document !== 'undefined';
  if (isWeb) {
    let matchCounter = 0;
    const html = text.replace(regex, (match) => {
      const isCurrent = matchCounter === highlightIndex;
      matchCounter++;
      const bg = isCurrent ? '#757575' : '#FFEB3B';
      const color = isCurrent ? '#ffffff' : '#000000';
      const weight = isCurrent ? 'bold' : '600';
      return `<mark style="background:${bg};color:${color};font-weight:${weight};padding:1px 3px;border-radius:2px">${match}</mark>`;
    });

    const webStyle: any = {
      fontSize: flatStyle.fontSize || 15,
      color: flatStyle.color || '#000',
      lineHeight: flatStyle.lineHeight ? `${flatStyle.lineHeight}px` : '1.5',
      fontFamily: flatStyle.fontFamily || 'inherit',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    };

    return React.createElement('div', {
      style: webStyle,
      dangerouslySetInnerHTML: { __html: html },
    });
  }

  // Native: use View wrappers with backgroundColor
  const parts = text.split(regex);
  let matchCounter = 0;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {parts.map((part, index) => {
        if (!part) return null;
        const isMatch = part.toLowerCase() === query.toLowerCase();

        if (isMatch) {
          const isCurrent = matchCounter === highlightIndex;
          const matchId = `match-${entryId}-${matchCounter}`;
          matchCounter++;
          return (
            <View
              key={`match-${index}`}
              nativeID={matchId}
              style={{ backgroundColor: isCurrent ? '#757575' : '#FFEB3B', borderRadius: 2, paddingHorizontal: 2 }}
            >
              <Text style={[flatStyle, { color: isCurrent ? '#FFFFFF' : '#000000', fontWeight: isCurrent ? 'bold' : '600' }]}>
                {part}
              </Text>
            </View>
          );
        }

        return <Text key={`text-${index}`} style={flatStyle}>{part}</Text>;
      })}
    </View>
  );
};



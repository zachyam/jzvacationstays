import { useState } from "react";

export function PropertyDescription({ description }: { description: string }) {
  const [showAll, setShowAll] = useState(false);

  if (!description || description.length === 0) return null;

  // Split into paragraphs
  const paragraphs = description.split(/\n\n+/).filter(p => p.trim());

  // Character limit for truncation
  const charLimit = 300;
  const fullText = description;
  const shouldTruncate = fullText.length > charLimit;

  // For truncation, we need to handle it carefully to preserve paragraph structure
  let displayedParagraphs = paragraphs;
  if (!showAll && shouldTruncate) {
    let charCount = 0;
    const truncatedParagraphs = [];

    for (const paragraph of paragraphs) {
      if (charCount + paragraph.length <= charLimit) {
        truncatedParagraphs.push(paragraph);
        charCount += paragraph.length;
      } else {
        // Truncate this paragraph and stop
        const remainingChars = charLimit - charCount;
        if (remainingChars > 50) { // Only add partial paragraph if it's substantial
          truncatedParagraphs.push(paragraph.slice(0, remainingChars) + "...");
        } else if (truncatedParagraphs.length > 0) {
          // Add ellipsis to the last paragraph
          truncatedParagraphs[truncatedParagraphs.length - 1] += "...";
        }
        break;
      }
    }
    displayedParagraphs = truncatedParagraphs;
  }

  return (
    <div>
      <div className="mb-12">
        <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-stone-900 mb-6">
            About this home
        </h2>
        <div className="text-lg font-light text-stone-700 leading-relaxed space-y-4">
          {displayedParagraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
    </div>

      {/* Show more/less button */}
      {shouldTruncate && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-6 mb-12 text-black hover:text-stone-700 font-semibold text-lg transition-colors flex items-center gap-2"
        >
          <span>{showAll ? "Show less" : "Show more"}</span>
          <iconify-icon
            icon={showAll ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
            class="w-5 h-5"
          />
        </button>
      )}
    </div>
  );
}
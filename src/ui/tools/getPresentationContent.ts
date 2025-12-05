import { Tool } from "../../../copilot-sdk-nodejs/types";

export const getPresentationContent: Tool = {
  name: "get_presentation_content",
  description: "Get the text content of a specific slide in the PowerPoint presentation. Uses 0-based indexing (0 for first slide, 1 for second, etc.).",
  parameters: {
    type: "object",
    properties: {
      slideIndex: {
        type: "number",
        description: "0-based slide index. Use 0 for first slide, 1 for second, etc.",
      },
    },
    required: ["slideIndex"],
  },
  handler: async ({ arguments: args }) => {
    const { slideIndex } = args as { slideIndex: number };

    try {
      return await PowerPoint.run(async (context) => {
        const slides = context.presentation.slides;
        slides.load("items");
        await context.sync();

        const slideCount = slides.items.length;

        if (slideIndex < 0 || slideIndex >= slideCount) {
          return { 
            textResultForLlm: `Invalid slideIndex ${slideIndex}. Must be 0-${slideCount - 1} (current slide count: ${slideCount})`, 
            resultType: "failure", 
            error: "Invalid slideIndex", 
            toolTelemetry: {} 
          };
        }

        const slide = slides.items[slideIndex];
        const shapes = slide.shapes;
        shapes.load("items");
        await context.sync();

        for (const shape of shapes.items) {
          try {
            shape.textFrame.textRange.load("text");
          } catch {}
        }
        await context.sync();

        const texts: string[] = [];
        for (const shape of shapes.items) {
          try {
            if (shape.textFrame?.textRange?.text) {
              texts.push(shape.textFrame.textRange.text);
            }
          } catch {}
        }

        return `Slide ${slideIndex + 1} of ${slideCount}:\n\n${texts.join("\n\n") || "(empty slide)"}`;
      });
    } catch (e: any) {
      return { textResultForLlm: e.message, resultType: "failure", error: e.message, toolTelemetry: {} };
    }
  },
};

declare module "react-mentions" {
  import type { CSSProperties, FC, ReactNode } from "react";

  export interface SuggestionDataItem {
    id: string | number;
    display?: string;
  }

  export interface MentionProps {
    trigger: string | RegExp;
    data:
      | SuggestionDataItem[]
      | ((
          query: string,
          callback: (results: SuggestionDataItem[]) => void
        ) => void);
    markup?: string;
    displayTransform?: (id: string | number, display: string) => string;
    renderSuggestion?: (
      suggestion: SuggestionDataItem,
      search: string,
      highlightedDisplay: ReactNode,
      index: number,
      focused: boolean
    ) => ReactNode;
    onAdd?: (
      id: string | number,
      display: string,
      startPos: number,
      endPos: number
    ) => void;
    appendSpaceOnAdd?: boolean;
    allowSpaceInQuery?: boolean;
    style?: CSSProperties;
  }

  export const Mention: FC<MentionProps>;

  export interface MentionsInputProps {
    id?: string;
    value?: string;
    onChange?: (
      event: { target: { value: string } },
      newValue: string,
      newPlainTextValue: string,
      mentions: unknown[]
    ) => void;
    placeholder?: string;
    disabled?: boolean;
    readOnly?: boolean;
    style?: Record<string, unknown>;
    className?: string;
    classNames?: unknown;
    singleLine?: boolean;
    allowSuggestionsAboveCursor?: boolean;
    a11ySuggestionsListLabel?: string;
    children: ReactNode;
  }

  export const MentionsInput: FC<MentionsInputProps>;
}

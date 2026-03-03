import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/bilesenler/arayuz/dialog";
import { Textarea } from "@/bilesenler/arayuz/textarea";
import { Input } from "@/bilesenler/arayuz/input";
import { Button } from "@/bilesenler/arayuz/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/bilesenler/arayuz/tabs";

interface EmojiPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEmoji: string;
  onEmojiSelect: (emoji: string) => void;
}

const EMOJI_CATEGORIES = {
  smileys: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "😋", "😛", "😜", "🤪", "😝", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐"],
  hearts: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "💔", "❣️", "💋", "👄", "🫶", "💏", "👨‍❤️‍👨", "👩‍❤️‍👩", "💑", "👨‍❤️‍👩", "👩‍❤️‍👨"],
  animals: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟", "🦗", "🕷️", "🕸️", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐝", "🐞"],
  food: ["🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🌽", "🥕", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔", "🍟", "🍕"],
  activities: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂", "🏋️‍♀️", "🏋️‍♂️", "🤼‍♀️", "🤼‍♂️", "🤸‍♀️", "🤸‍♂️", "⛹️‍♀️", "⛹️‍♂️", "🤺", "🤾‍♀️", "🤾‍♂️", "🏌️‍♀️", "🏌️‍♂️", "🏇", "🧘‍♀️", "🧘‍♂️", "🏄‍♀️", "🏄‍♂️", "🏊‍♀️", "🏊‍♂️"],
  study: ["📚", "📖", "📝", "✏️", "📒", "📓", "📔", "📕", "📗", "📘", "📙", "📑", "🔖", "🏷️", "💼", "📁", "📂", "🗂️", "📅", "📆", "🗓️", "📇", "📈", "📉", "📊", "📋", "📌", "📍", "📎", "🖇️", "📏", "📐", "✂️", "🗃️", "🗄️", "🗑️", "🔒", "🔓", "🔏", "🔐", "🔑", "🗝️", "🔨", "🪓", "⛏️", "⚒️", "🛠️", "🗡️", "🔗", "⛓️", "🧰", "🧲", "⚗️", "🧪", "🧫", "🧬", "🔬", "🔭", "📡", "💉", "🩸", "💊", "🩹"]
};

export function EmojiPicker({ open, onOpenChange, selectedEmoji, onEmojiSelect }: EmojiPickerProps) {
  const [showPreview, setShowPreview] = useState(false);

  const handleEmojiSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    setShowPreview(true);
  };

  const handleSave = () => {
    setShowPreview(false);
    onOpenChange(false);
  };

  const handleClear = () => {
    onEmojiSelect('😊');
    setShowPreview(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Ruh Halim İçin Emoji Seçme Alanı</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Önizleme Bölümü */}
          {showPreview && selectedEmoji && (
            <div className="relative">
              <div 
                className="inline-flex items-center space-x-2 px-4 py-3 rounded-xl transition-all duration-500 bg-primary/10 border border-primary/20"
              >
                <span className="text-4xl" role="img" aria-label="selected emoji">
                  {selectedEmoji}
                </span>
              </div>
            </div>
          )}

          {/* Emoji Kategorileri */}
          <Tabs defaultValue="smileys" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="smileys" className="text-xs">😊</TabsTrigger>
              <TabsTrigger value="hearts" className="text-xs">❤️</TabsTrigger>
              <TabsTrigger value="animals" className="text-xs">🐱</TabsTrigger>
              <TabsTrigger value="food" className="text-xs">🍎</TabsTrigger>
              <TabsTrigger value="activities" className="text-xs">⚽</TabsTrigger>
              <TabsTrigger value="study" className="text-xs">📚</TabsTrigger>
            </TabsList>

            {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
              <TabsContent key={category} value={category} className="space-y-2">
                <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-muted/50">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiSelect(emoji)}
                      className={`text-2xl p-2 rounded hover:bg-secondary transition-colors ${
                        selectedEmoji === emoji ? 'bg-primary/20 ring-2 ring-primary' : ''
                      }`}
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* etkileşim Düğmeleri */}
          <div className="flex justify-between space-x-2">
            <Button variant="outline" onClick={handleClear}>
              Temizle
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                İptal
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!selectedEmoji}
                className="min-w-[80px]"
              >
                Kaydet
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

    </Dialog>
  );
}


import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, EyeOff, MoreHorizontal, ArrowUp, ArrowDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GuideSection } from "@/lib/data/properties";
import { useI18n } from "@/lib/i18n";

import { isEditorialSection, reorderEditorialSections } from "./section-order";

export function SectionOrganizer({
  sections,
  selected,
  disabled,
  label,
  onSelect,
  onReorder,
}: {
  sections: GuideSection[];
  selected: string | null;
  disabled: boolean;
  label: (section: GuideSection) => string;
  onSelect: (id: string) => void;
  onReorder: (next: GuideSection[]) => void;
}) {
  const { t } = useI18n();
  const [active, setActive] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const editorial = sections.filter(isEditorialSection);
  const move = (id: string, target: string) => {
    const next = reorderEditorialSections(sections, id, target);
    if (next !== sections) onReorder(next);
  };
  const end = ({ active, over }: DragEndEvent) => {
    setActive(null);
    if (over && !disabled) move(String(active.id), String(over.id));
  };
  const dragged = editorial.find((section) => section.id === active);
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => setActive(String(active.id))}
      onDragCancel={() => setActive(null)}
      onDragEnd={end}
      accessibility={{
        screenReaderInstructions: { draggable: t("editor.dragInstructions") },
        announcements: {
          onDragStart: ({ active }) =>
            `${t("editor.moveSection")}: ${label(editorial.find((s) => s.id === active.id)!)}`,
          onDragOver: ({ over }) =>
            over
              ? `${t("editor.position")} ${editorial.findIndex((s) => s.id === over.id) + 1}`
              : undefined,
          onDragEnd: () => t("editor.dropped"),
          onDragCancel: () => t("manager.cancel"),
        },
      }}
    >
      <SortableContext items={editorial.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="section-organizer" aria-label={t("editor.sectionsOrder")}>
          {editorial.map((section, index) => (
            <SortableSection
              key={section.id}
              section={section}
              label={label(section)}
              selected={selected === section.id}
              disabled={disabled}
              onSelect={() => onSelect(section.id)}
              canUp={index > 0}
              canDown={index < editorial.length - 1}
              onMove={(direction) => move(section.id, editorial[index + direction]!.id)}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay style={{ pointerEvents: "none" }}>
        {dragged ? (
          <div className="section-organizer-overlay">
            <GripVertical size={18} />
            {label(dragged)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
function SortableSection({
  section,
  label,
  selected,
  disabled,
  onSelect,
  canUp,
  canDown,
  onMove,
}: {
  section: GuideSection;
  label: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  canUp: boolean;
  canDown: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  const { t } = useI18n();
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, disabled });
  return (
    <div
      ref={setNodeRef}
      className={`section-organizer-row ${isDragging ? "is-dragging" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-section-id={section.id}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="section-drag-handle"
        disabled={disabled}
        aria-label={`${t("editor.moveSection")}: ${label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} />
      </button>
      <button type="button" className="section-select" aria-pressed={selected} onClick={onSelect}>
        <span className="truncate">{label}</span>
        {!section.is_visible && <EyeOff size={14} aria-label={t("editor.hidden")} />}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="section-menu"
            aria-label={`${t("editor.sectionActions")}: ${label}`}
          >
            <MoreHorizontal size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem disabled={!canUp} onSelect={() => onMove(-1)}>
            <ArrowUp size={14} />
            {t("manager.moveUp")}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canDown} onSelect={() => onMove(1)}>
            <ArrowDown size={14} />
            {t("manager.moveDown")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

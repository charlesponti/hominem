import { Button } from '@hominem/ui/button';
import { List } from '@hominem/ui/list';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { Edit2, Star, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';

import { useDeletePlaceVisit, usePlaceVisits } from '~/lib/hooks/use-places';
import { useHonoUtils } from '@hominem/hono-client/react';

import { LogVisit } from './LogVisit';

interface VisitHistoryProps {
  placeId: string;
  placeName: string;
}

interface VisitItemProps {
  visit: {
    id: string;
    title: string;
    date: Date | string;
    description: string | null;
    visitNotes: string | null;
    visitReview: string | null;
    visitPeople: string | null;
    visitRating: number | null;
    people?: Array<{ id: string }>;
  };
  placeId: string;
  placeName: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.15,
      ease: 'easeIn',
    },
  },
};

function VisitItem({ visit, placeId, placeName, isEditing, onEdit, onCancel }: VisitItemProps) {
  const utils = useHonoUtils();
  const deleteVisit = useDeletePlaceVisit();

  const handleDelete = useCallback(async () => {
    if (confirm('Are you sure you want to delete this visit?')) {
      await deleteVisit.mutateAsync({ id: visit.id });
      utils.invalidate(['places', 'place-visits', placeId]);
      utils.invalidate(['places', 'visit-stats', placeId]);
    }
  }, [visit.id, deleteVisit, placeId, utils]);

  if (isEditing) {
    return (
      <motion.li variants={itemVariants} layout className="py-2">
        <LogVisit
          placeId={placeId}
          placeName={placeName}
          visit={visit}
          onSuccess={onCancel}
          onCancel={onCancel}
        />
      </motion.li>
    );
  }

  return (
    <motion.li variants={itemVariants} layout className="group">
      <div className="flex items-center gap-3 p-2 hover:bg-gray-50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {new Date(visit.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <p className="flex-1 text-sm text-accent-foreground truncate font-medium">
              {visit.title}
            </p>
            <div className="space-x-6 flex items-center">
              {visit.visitRating && (
                <div className="flex items-center gap-1 shrink-0">
                  <Star className="size-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs text-muted-foreground">{visit.visitRating}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <Button variant="ghost" size="icon" aria-label="Edit visit" onClick={onEdit}>
                  <Edit2 className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDelete}
                  disabled={deleteVisit.isPending}
                  aria-label="Delete visit"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </div>
          {(visit.description || visit.visitNotes || visit.visitReview || visit.visitPeople) && (
            <div className="mt-1 space-y-0.5">
              {visit.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">{visit.description}</p>
              )}
              {visit.visitNotes && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  <span className="font-medium">Notes:</span> {visit.visitNotes}
                </p>
              )}
              {visit.visitReview && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  <span className="font-medium">Review:</span> {visit.visitReview}
                </p>
              )}
              {visit.visitPeople && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">With:</span> {visit.visitPeople}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.li>
  );
}

export function VisitHistory({ placeId, placeName }: VisitHistoryProps) {
  const { data: visitsResult, isLoading: visitsLoading } = usePlaceVisits(placeId);
  const visits = visitsResult ?? [];

  const [showInlineForm, setShowInlineForm] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <h3 className="heading-2 font-light">Visit History</h3>
        <Button
          variant="outline"
          size="sm"
          aria-expanded={showInlineForm}
          aria-controls="log-visit-inline-form"
          onClick={() => {
            setShowInlineForm((v) => !v);
            setEditingVisitId(null);
          }}
        >
          {showInlineForm ? 'Cancel' : 'Log Visit'}
        </Button>
      </div>

      {showInlineForm && (
        <div id="log-visit-inline-form" className="py-2">
          <LogVisit
            placeId={placeId}
            placeName={placeName}
            onSuccess={() => setShowInlineForm(false)}
            onCancel={() => setShowInlineForm(false)}
          />
        </div>
      )}

      {!visitsLoading && (!visits || visits.length === 0) ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-muted-foreground py-4"
        >
          No visits recorded yet.
        </motion.div>
      ) : (
        <List isLoading={visitsLoading} loadingSize="md">
          <AnimatePresence mode="popLayout">
            {visits?.map((visit: any) => (
              <VisitItem
                key={visit.id}
                visit={visit}
                placeId={placeId}
                placeName={placeName}
                isEditing={editingVisitId === visit.id}
                onEdit={() => {
                  setEditingVisitId(visit.id);
                  setShowInlineForm(false);
                }}
                onCancel={() => setEditingVisitId(null)}
              />
            ))}
          </AnimatePresence>
        </List>
      )}
    </div>
  );
}

'use client';
import React, { useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Play, File, X, Menu } from 'lucide-react';
import { FullCourseContent } from '@/db/course';
import { useRecoilState, useRecoilValue } from 'recoil';
import { sidebarOpen as sidebarOpenAtom } from '@/store/atoms/sidebar';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { handleMarkAsCompleted } from '@/lib/utils';
import BookmarkButton from './bookmark/BookmarkButton';
import Link from 'next/link';
import { Button } from './ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { FilterContent } from './FilterContent';
import { selectFilter } from '@/store/atoms/filterContent';
const sidebarVariants = {
  open: {
    width: '100%',
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
  closed: {
    width: 0,
    opacity: 0,
    x: '100%',
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
};

export function Sidebar({
  courseId,
  fullCourseContent,
}: {
  fullCourseContent: FullCourseContent[];
  courseId: string;
}) {
  const pathName = usePathname();
  const [sidebarOpen, setSidebarOpen] = useRecoilState(sidebarOpenAtom);
  const [currentActiveContentIds, setCurrentActiveContentIds] = useState<
    number[]
  >([]);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const closeSidebar = () => setSidebarOpen(false);
  const currentfilter = useRecoilValue(selectFilter);

  const findPathToContent = useCallback(
    (
      contents: FullCourseContent[],
      targetId: number,
      currentPath: number[] = [],
    ): number[] | null => {
      for (const content of contents) {
        const newPath = [...currentPath, content.id];
        if (content.id === targetId) return newPath;
        if (content.children) {
          const childPath = findPathToContent(
            content.children,
            targetId,
            newPath,
          );
          if (childPath) return childPath;
        }
      }
      return null;
    },
    [],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node) &&
        !filterRef.current?.contains(event.target as Node)
      ) {
        closeSidebar();
      }
    };

    // listen for ESC key and close the sidebar
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSidebar();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [sidebarRef]);

  useEffect(() => {
    const urlRegex = /\/courses\/.*./;
    const courseUrlRegex = /\/courses\/\d+((?:\/\d+)+)/;

    if (urlRegex.test(pathName)) {
      const matchArray = pathName.match(courseUrlRegex);
      if (matchArray) {
        const currentUrlContentId = Number(matchArray[1].split('/')[1]);
        const pathArray = findPathToContent(
          fullCourseContent,
          currentUrlContentId,
        );
        setCurrentActiveContentIds(pathArray || []);
        setSidebarOpen(false);
      }
    }
  }, [pathName, findPathToContent, fullCourseContent]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

  const navigateToContent = useCallback(
    (contentId: number) => {
      const pathArray = findPathToContent(fullCourseContent, contentId);
      return pathArray ? `/courses/${courseId}/${pathArray.join('/')}` : null;
    },
    [courseId, findPathToContent, fullCourseContent],
  );

  const activeItemRef = useRef<HTMLDivElement | HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (sidebarOpen && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      // focus on the active item
      if (activeItemRef.current instanceof HTMLAnchorElement) {
        activeItemRef.current.focus();
      } else if (activeItemRef.current instanceof HTMLDivElement) {
        // check for the first focusable element and focus on it
        const firstFocusableElement =
          activeItemRef.current.querySelector('button, a');
        if (firstFocusableElement) {
          (
            firstFocusableElement as HTMLButtonElement | HTMLAnchorElement
          ).focus();
        }
      }
    }
  }, [sidebarOpen]);

  const renderContent = useCallback(
    (contents: FullCourseContent[]) => {
      return contents.map((content) => {
        const isActiveContent = currentActiveContentIds?.includes(content.id);
        if (content.children && content.children.length > 0) {
          return (
            <AccordionItem
              key={content.id}
              value={`item-${content.id}`}
              className={`rounded-md border-none ${isActiveContent ? 'bg-primary/5' : ''}`}
              ref={
                isActiveContent
                  ? (activeItemRef as React.RefObject<HTMLDivElement>)
                  : null
              }
            >
              <AccordionTrigger className="rounded-md px-4 text-lg font-medium capitalize">
                {content.title}
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-1 px-2 pb-2">
                {renderContent(content.children)}
              </AccordionContent>
            </AccordionItem>
          );
        }

        return (
          <Link
            key={content.id}
            href={navigateToContent(content.id) || '#'}
            className={`flex w-full cursor-pointer items-center rounded-md p-4 tracking-tight hover:bg-primary/10 ${isActiveContent ? 'bg-primary/10' : ''}`}
            ref={
              isActiveContent
                ? (activeItemRef as React.RefObject<HTMLAnchorElement>)
                : null
            }
          >
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex gap-2">
                {content.type === 'video' && <Check content={content} />}
                {content.type === 'video' && <Play className="size-4" />}
                {content.type === 'notion' && <File className="size-4" />}
              </div>
              <div className="grow">{content.title}</div>
              {content.type === 'video' && (
                <div className="flex-none">
                  <BookmarkButton
                    bookmark={content.bookmark ?? null}
                    contentId={content.id}
                  />
                </div>
              )}
            </div>
          </Link>
        );
      });
    },
    [currentActiveContentIds, navigateToContent, currentfilter],
  );

  const memoizedContent = useMemo(
    () => renderContent(fullCourseContent),
    [fullCourseContent, renderContent],
  );

  return (
    <div className="sticky top-[72px] z-20 py-2">
      <Button
        ref={buttonRef}
        onClick={() => setSidebarOpen((s) => !s)}
        className="w-fit gap-2 transition-all duration-200 active:scale-95"
      >
        {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        <span>{sidebarOpen ? 'Hide Contents' : 'Show Contents'}</span>
      </Button>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="sidebar"
            initial="closed"
            animate="open"
            ref={sidebarRef}
            exit="closed"
            variants={sidebarVariants}
            className="fixed right-0 top-[64px] z-[99999] flex h-screen w-full flex-col gap-4 overflow-y-auto rounded-r-lg border-l border-primary/10 bg-neutral-50 dark:bg-neutral-900 md:max-w-[30vw]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-primary/10 bg-neutral-50 p-5 dark:bg-neutral-900">
              {' '}
              <h4 className="text-xl font-bold tracking-tighter text-primary lg:text-2xl">
                Course Content
              </h4>
              <FilterContent
                className="bg-gray-400 text-black"
                ref={filterRef}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="size-5" />
              </Button>
            </div>
            <Accordion
              type="multiple"
              defaultValue={currentActiveContentIds.map((num) => `item-${num}`)}
              className="w-full px-4 pb-40 capitalize"
            >
              {memoizedContent}
            </Accordion>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Check({ content }: { content: any }) {
  const [completed, setCompleted] = useState(
    content?.videoProgress?.markAsCompleted || false,
  );

  const handleCheck = useCallback(
    async (e: React.MouseEvent<HTMLInputElement>) => {
      e.stopPropagation();
      const newState = !completed;
      setCompleted(newState);
      await handleMarkAsCompleted(newState, content.id);
    },
    [completed, content.id],
  );

  return (
    <input
      checked={completed}
      onChange={() => {}} // Controlled component
      onClick={handleCheck}
      type="checkbox"
      className="focus:ring-none h-4 w-4 rounded-md border-primary/10"
    />
  );
}

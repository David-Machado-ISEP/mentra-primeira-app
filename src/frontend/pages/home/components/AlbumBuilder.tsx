import { useState } from "react";
import {
  Download,
  Images,
  X,
  Share2,
  ArrowLeft,
  Edit3,
  Trash2,
  FolderOpen,
  Image,
  Sparkles,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui";

import type { Photo } from "./PhotoStream";


type LogType = "info" | "success" | "warning" | "error";

interface AlbumBuilderProps {
  photos: Photo[];
  selectedPhotoIds: string[];
  onClearSelection: () => void;
  onLog: (message: string, type?: LogType) => void;
}

interface Album {
  id: string;
  name: string;
  photos: Photo[];
  createdAt: string;
}

export function AlbumBuilder({
  photos,
  selectedPhotoIds,
  onClearSelection,
  onLog,
}: AlbumBuilderProps) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [openedAlbumId, setOpenedAlbumId] = useState<string | null>(null);
  const [openedPhoto, setOpenedPhoto] = useState<Photo | null>(null);
  const [albumMemories, setAlbumMemories] = useState<Record<string, string>>(
    {},
  );
  const [generatingMemoryAlbumId, setGeneratingMemoryAlbumId] = useState<
    string | null
  >(null);

  const selectedPhotos = photos.filter((photo) =>
    selectedPhotoIds.includes(photo.id),
  );

  const openedAlbum = albums.find((album) => album.id === openedAlbumId);

  const createAlbum = () => {
    if (selectedPhotos.length === 0) {
      onLog("No photos selected for album", "warning");
      return;
    }

    const albumNumber = albums.length + 1;

    const newAlbum: Album = {
      id: crypto.randomUUID(),
      name: `Travel Album ${albumNumber}`,
      photos: selectedPhotos,
      createdAt: new Date().toLocaleString(),
    };

    setAlbums((prev) => [newAlbum, ...prev]);
    setOpenedAlbumId(newAlbum.id);
    onClearSelection();

    onLog(`Album created: ${newAlbum.name}`, "success");
  };

  const generateAlbumMemory = async (album: Album) => {
    try {
      setGeneratingMemoryAlbumId(album.id);

      const response = await fetch("/api/album-memory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          albumName: album.name,
          photoCount: album.photos.length,
          photoTimes: album.photos.map((photo) => photo.timestamp),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate album memory");
      }

      setAlbumMemories((prev) => ({
        ...prev,
        [album.id]: data.memory,
      }));

      onLog(`AI memory generated for album: ${album.name}`, "success");
    } catch (error) {
      console.error("[AlbumBuilder] Failed to generate album memory", error);
      onLog("Failed to generate album memory", "error");
    } finally {
      setGeneratingMemoryAlbumId(null);
    }
  };

  const renameAlbum = (albumId: string) => {
    const album = albums.find((item) => item.id === albumId);
    if (!album) return;

    const newName = window.prompt("New album name:", album.name);

    if (!newName || newName.trim().length === 0) {
      onLog("Album rename cancelled", "info");
      return;
    }

    setAlbums((prev) =>
      prev.map((item) =>
        item.id === albumId ? { ...item, name: newName.trim() } : item,
      ),
    );

    onLog(`Album renamed to: ${newName.trim()}`, "info");
  };

  const deleteAlbum = (albumId: string) => {
    const album = albums.find((item) => item.id === albumId);

    setAlbums((prev) => prev.filter((album) => album.id !== albumId));

    if (openedAlbumId === albumId) {
      setOpenedAlbumId(null);
      setOpenedPhoto(null);
    }

    onLog(album ? `Album deleted: ${album.name}` : "Album deleted", "warning");
  };

  const sharePhoto = async (photo: Photo) => {
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();

      const file = new File([blob], `mentra-photo-${photo.id}.jpg`, {
        type: blob.type || "image/jpeg",
      });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Mentra Travel Photo",
          text: "Photo captured with Mentra Live",
          files: [file],
        });

        onLog("Photo shared successfully", "success");
      } else {
        onLog("Sharing this photo is not supported in this webview", "warning");
      }
    } catch {
      onLog("Failed to share photo", "error");
    }
  };

  const shareAlbum = async (album: Album) => {
    try {
      if (album.photos.length === 0) {
        onLog("No album photos to share", "warning");
        return;
      }

      const files = await Promise.all(
        album.photos.map(async (photo, index) => {
          const response = await fetch(photo.url);
          const blob = await response.blob();

          return new File([blob], `${album.name}-photo-${index + 1}.jpg`, {
            type: blob.type || "image/jpeg",
          });
        }),
      );

      if (navigator.share && navigator.canShare?.({ files })) {
        await navigator.share({
          title: album.name,
          text: `Album captured with Mentra Live: ${album.name}`,
          files,
        });

        onLog(`Album shared: ${album.name}`, "success");
      } else {
        onLog(
          "Sharing multiple photos is not supported in this webview",
          "warning",
        );
      }
    } catch {
      onLog("Failed to share album", "error");
    }
  };

  if (openedPhoto && openedAlbum) {
    return (
      <Card className="ab-card">
        <CardHeader className="ab-photo-header">
          <div className="ab-topbar">
            <button
              type="button"
              onClick={() => setOpenedPhoto(null)}
              className="ab-button ab-button-secondary"
            >
              <ArrowLeft className="ab-button-icon" />
              Back
            </button>

            <button
              type="button"
              onClick={() => sharePhoto(openedPhoto)}
              className="ab-button ab-button-primary"
            >
              <Share2 className="ab-button-icon" />
              Share / Save
            </button>
          </div>
        </CardHeader>

        <CardContent className="ab-photo-content">
          <div className="ab-photo-preview">
            <img
              src={openedPhoto.url}
              alt={`Photo captured at ${openedPhoto.timestamp}`}
              className="ab-opened-photo"
            />
          </div>

          <div className="ab-photo-meta">
            <Image className="ab-meta-icon" />
            <span>
              {openedAlbum.name} · Captured at {openedPhoto.timestamp}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (openedAlbum) {
    return (
      <Card className="ab-card">
        <CardHeader className="ab-album-header">
          <div className="ab-topbar">
            <button
              type="button"
              onClick={() => setOpenedAlbumId(null)}
              className="ab-button ab-button-secondary"
            >
              <ArrowLeft className="ab-button-icon" />
              Albums
            </button>

            <button
              type="button"
              onClick={() => generateAlbumMemory(openedAlbum)}
              className="ab-button ab-button-secondary"
              disabled={generatingMemoryAlbumId === openedAlbum.id}
            >
              <Sparkles className="ab-button-icon" />
              {generatingMemoryAlbumId === openedAlbum.id
                ? "Generating..."
                : "Generate AI Memory"}
            </button>

            <button
              type="button"
              onClick={() => shareAlbum(openedAlbum)}
              className="ab-button ab-button-primary"
            >
              <Share2 className="ab-button-icon" />
              Share Album
            </button>
          </div>
        </CardHeader>

        <CardContent className="ab-album-content">
          <div className="ab-album-title-row">
            <div>
              <h3 className="ab-album-title">{openedAlbum.name}</h3>
              <p className="ab-album-subtitle">
                {openedAlbum.photos.length} photos · {openedAlbum.createdAt}
              </p>
            </div>

            <button
              type="button"
              onClick={() => renameAlbum(openedAlbum.id)}
              className="ab-button ab-button-outline"
            >
              <Edit3 className="ab-button-icon" />
              Rename
            </button>
          </div>

          {albumMemories[openedAlbum.id] && (
            <div className="ab-ai-memory-card">
              <div className="ab-ai-memory-header">
                <Sparkles className="ab-ai-memory-icon" />
                <h3>AI Travel Memory</h3>
              </div>

              <p>{albumMemories[openedAlbum.id]}</p>
            </div>
          )}

          <div className="ab-photo-grid">
            {openedAlbum.photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setOpenedPhoto(photo)}
                className="ab-album-photo-card"
              >
                <img
                  src={photo.url}
                  alt={`Album photo captured at ${photo.timestamp}`}
                  className="ab-album-photo"
                />

                <div className="ab-album-photo-footer">
                  <span>Tap to open</span>
                  <small>Captured at {photo.timestamp}</small>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="ab-card">
      <CardHeader className="ab-header">
        <div className="ab-heading">
          <div className="ab-heading-icon">
            <Images className="ab-heading-icon-svg" />
          </div>

          <div>
            <CardTitle className="ab-title">Travel Albums</CardTitle>
            <p className="ab-description">
              Create albums from selected travel moments.
            </p>
          </div>
        </div>

        <div className="ab-counter">
          <strong>{albums.length}</strong>
          <span>{albums.length === 1 ? "album" : "albums"}</span>
        </div>
      </CardHeader>

      <CardContent className="ab-content">
        <div className="ab-create-box">
          <div>
            <p className="ab-create-title">Selected photos</p>
            <p className="ab-create-text">
              {selectedPhotos.length > 0
                ? `${selectedPhotos.length} photo${
                    selectedPhotos.length === 1 ? "" : "s"
                  } ready to add`
                : "Select photos from the photo stream to create an album."}
            </p>
          </div>

          <div className="ab-actions">
            <button
              type="button"
              onClick={createAlbum}
              disabled={selectedPhotos.length === 0}
              className="ab-button ab-button-primary ab-create-button"
            >
              <Download className="ab-button-icon" />
              Create Album ({selectedPhotos.length})
            </button>

            <button
              type="button"
              onClick={onClearSelection}
              disabled={selectedPhotos.length === 0}
              className="ab-button ab-button-secondary"
            >
              <X className="ab-button-icon" />
              Clear
            </button>
          </div>
        </div>

        {albums.length === 0 ? (
          <div className="ab-empty-state">
            <div className="ab-empty-icon">
              <FolderOpen className="ab-empty-icon-svg" />
            </div>

            <p className="ab-empty-title">No albums created yet</p>
            <p className="ab-empty-text">
              Select a few photos and create your first travel album.
            </p>
          </div>
        ) : (
          <div className="ab-albums-section">
            <div className="ab-section-heading">
              <h3>My Albums</h3>
              <span>{albums.length} total</span>
            </div>

            <div className="ab-albums-list">
              {albums.map((album) => (
                <article key={album.id} className="ab-album-card">
                  <button
                    type="button"
                    onClick={() => setOpenedAlbumId(album.id)}
                    className="ab-album-main"
                  >
                    <div className="ab-album-cover-wrap">
                      <img
                        src={album.photos[0]?.url}
                        alt={album.name}
                        className="ab-album-cover"
                      />

                      <div className="ab-album-cover-badge">
                        {album.photos.length}
                      </div>
                    </div>

                    <div className="ab-album-info">
                      <p className="ab-album-name">{album.name}</p>
                      <p className="ab-album-details">
                        {album.photos.length} photos · {album.createdAt}
                      </p>
                    </div>
                  </button>

                  <div className="ab-album-actions">
                    <button
                      type="button"
                      onClick={() => renameAlbum(album.id)}
                      className="ab-icon-button"
                      aria-label="Rename album"
                    >
                      <Edit3 className="ab-icon-button-svg" />
                    </button>

                    <button
                      type="button"
                      onClick={() => shareAlbum(album)}
                      className="ab-icon-button"
                      aria-label="Share album"
                    >
                      <Share2 className="ab-icon-button-svg" />
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteAlbum(album.id)}
                      className="ab-icon-button ab-icon-button-danger"
                      aria-label="Delete album"
                    >
                      <Trash2 className="ab-icon-button-svg" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

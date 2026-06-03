import { Camera, Image, CheckCircle, Images } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui";


export interface Photo {
  id: string;
  url: string;
  timestamp: string;
  requestId: string;
  tripId?: string;
}

interface PhotoStreamProps {
  photos: Photo[];
  selectedPhotoIds: string[];
  onTogglePhoto: (photoId: string) => void;
}

export function PhotoStream({
  photos,
  selectedPhotoIds,
  onTogglePhoto,
}: PhotoStreamProps) {
  return (
    <Card className="ps-card">
      <CardHeader className="ps-header">
        <div className="ps-heading">
          <div className="ps-heading-icon">
            <Camera className="ps-heading-icon-svg" />
          </div>

          <div>
            <CardTitle className="ps-title">Photo Stream</CardTitle>
            <p className="ps-description">
              Captured moments from the Mentra Live camera.
            </p>
          </div>
        </div>

        <div className="ps-counter-group">
          <div className="ps-counter">
            <strong>{photos.length}</strong>
            <span>captured</span>
          </div>

          <div className="ps-counter ps-counter-selected">
            <strong>{selectedPhotoIds.length}</strong>
            <span>selected</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="ps-content">
        {photos.length === 0 ? (
          <div className="ps-empty-state">
            <div className="ps-empty-icon">
              <Image className="ps-empty-icon-svg" />
            </div>

            <p className="ps-empty-title">Waiting for photo captures</p>

            <p className="ps-empty-text">
              Use the glasses touch gesture or camera button to capture travel
              moments.
            </p>
          </div>
        ) : (
          <div className="ps-grid">
            {photos.map((photo) => {
              const isSelected = selectedPhotoIds.includes(photo.id);

              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => onTogglePhoto(photo.id)}
                  className={`ps-photo-card ${
                    isSelected ? "ps-photo-card-selected" : ""
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={`Captured at ${photo.timestamp}`}
                    className="ps-photo"
                  />

                  <div className="ps-photo-overlay" />

                  <div className="ps-photo-time">
                    <Camera className="ps-photo-time-icon" />
                    <span>{photo.timestamp}</span>
                  </div>

                  <div className="ps-photo-action">
                    {isSelected ? (
                      <>
                        <CheckCircle className="ps-photo-action-icon" />
                        <span>Selected</span>
                      </>
                    ) : (
                      <>
                        <Images className="ps-photo-action-icon" />
                        <span>Select</span>
                      </>
                    )}
                  </div>

                  {isSelected && (
                    <div className="ps-selected-badge">
                      <CheckCircle className="ps-selected-badge-icon" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

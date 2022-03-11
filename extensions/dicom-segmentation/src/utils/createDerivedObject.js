

export function createDerivedObject(referencedSeries) {
  const dcmjs = require("dcmjs");

  let datasets = [];
  var i = 0;
  referencedSeries.forEach(reference => {
    var naturalized = dcmjs.data.DicomMetaDictionary.naturalizeDataset(reference);
    datasets.push(naturalized)
    i=i+1;
  })

  var derivated = new dcmjs.derivations.DerivedDataset(datasets, {
      SeriesNumber: "300",
      DeviceSerialNumber: "0",
  });

  derivated.assignToDataset({
    SOPClassUID: dcmjs.data.DicomMetaDictionary.sopClassUIDsByName.Segmentation,
    Modality: "SEG",
    SamplesPerPixel: "1",
    PhotometricInterpretation: "MONOCHROME2",
    BitsAllocated: "1",
    BitsStored: "1",
    HighBit: "0",
    PixelRepresentation: "0",
    LossyImageCompression: "00",
    SegmentationType: "BINARY",
    ContentLabel: "SEGMENTATION"
  })

  derivated.assignFromReference([
    "FrameOfReferenceUID",
    "PositionReferenceIndicator",
    "Rows",
    "Columns",
  ]);

  let dimensionUID = dcmjs.data.DicomMetaDictionary.uid();
  derivated.dataset.DimensionOrganizationSequence = {
     DimensionOrganizationUID: dimensionUID
  };
  derivated.dataset.DimensionIndexSequence = [
    {
       DimensionOrganizationUID: dimensionUID,
       DimensionIndexPointer: 6422539,
       FunctionalGroupPointer: 6422538, // SegmentIdentificationSequence
       DimensionDescriptionLabel: "ReferencedSegmentNumber"
    },
    {
       DimensionOrganizationUID: dimensionUID,
       DimensionIndexPointer: 2097202,
       FunctionalGroupPointer: 2134291, // PlanePositionSequence
       DimensionDescriptionLabel: "ImagePositionPatient"
    }
  ];

  derivated.dataset.SegmentSequence = [];
  const ReferencedInstanceSequence = [];

  for (let i = 0; i < referencedSeries.length; i++) {
      ReferencedInstanceSequence.push({
          ReferencedSOPClassUID: datasets[i]
              .SOPClassUID,
          ReferencedSOPInstanceUID: datasets[i]
              .SOPInstanceUID
      });
  }

  derivated.dataset.ReferencedSeriesSequence = {
      SeriesInstanceUID: datasets[0].SeriesInstanceUID,
      ReferencedInstanceSequence
  };


  // The pixelData array needs to be defined once you know how many frames you'll have.
  derivated.dataset.PerFrameFunctionalGroupsSequence = [];
  //derivated.dataset.SharedFunctionalGroupsSequence = [];
  derivated.dataset.NumberOfFrames = 0;
  derivated.dataset.PixelData = undefined;

  return derivated;
}


export function setNumberOfFrames(derivated, numberOfFrames) {
  derivated.dataset.NumberOfFrames = numberOfFrames;
  derivated.dataset.PixelData = new ArrayBuffer(
      derivated.dataset.Rows * derivated.dataset.Columns * numberOfFrames
  );
  // console.log("Size buffer pixelData: ", derivated.dataset.PixelData)
  return derivated;
}

export function addSegment(Segment, derivated, pixelData, referencedFrameNumbers) {
  if (derivated.dataset.NumberOfFrames === 0) {
      throw new Error(
            "Must set the total number of frames via setNumberOfFrames() before adding segments to the segmentation."
      );
  }
  _addSegmentPixelData(derivated, pixelData);
  var ReferencedSegmentNumber = _addSegmentMetadata(derivated, Segment);
  _addPerFrameFunctionalGroups(
            derivated,
            ReferencedSegmentNumber,
            referencedFrameNumbers
  );
}

export function _addSegmentPixelData(derivated, pixelData) {
    const dataset = derivated.dataset;  // Maybe references use ? check if modifcations are taken into account after function call
    if (dataset.PerFrameFunctionalGroupsSequence.length > 0 ) {
      const existingFrames = dataset.PerFrameFunctionalGroupsSequence.length;
      const sliceLength = dataset.Rows * dataset.Columns;
      const byteOffset = existingFrames * sliceLength;
      const pixelDataUInt8View = new Uint8Array(
          dataset.PixelData,
          byteOffset,
          pixelData.length
      );
      for (let i = 0; i < pixelData.length; i++) {
          pixelDataUInt8View[i] = pixelData[i];
      }
    }
    else {
      dataset.PixelData = pixelData.buffer;
    }
}

export function _addPerFrameFunctionalGroups(
    derivated,
    ReferencedSegmentNumber,
    referencedFrameNumbers
) {
    const dcmjs = require("dcmjs");
    const PerFrameFunctionalGroupsSequence = derivated.dataset
            .PerFrameFunctionalGroupsSequence;

    var ReferencedSeriesSequence = undefined;
    // This won't work cause referencedDataset does no contain ReferencedSeriesSequence
    if (derivated.referencedDataset.ReferencedSeriesSequence)
    {
      ReferencedSeriesSequence = derivated.referencedDataset
            .ReferencedSeriesSequence;
    } else {
      ReferencedSeriesSequence = derivated.dataset.ReferencedSeriesSequence;
    }

    for (let i = 0; i < referencedFrameNumbers.length; i++) {
        const frameNumber = referencedFrameNumbers[i];
        console.log(frameNumber, referencedFrameNumbers)
        const perFrameFunctionalGroups = {};

        // referencedDataset does not contain PlanePositionSequence ??
        if ( derivated.referencedDataset.PerFrameFunctionalGroupsSequence ){
          perFrameFunctionalGroups.PlanePositionSequence = dcmjs.derivations.DerivedDataset.copyDataset(
              derivated.referencedDataset.PerFrameFunctionalGroupsSequence[
                  frameNumber-1
              ].PlanePositionSequence
          );
          
          // If the PlaneOrientationSequence is not in the SharedFunctionalGroupsSequence,
          // extract it from the PerFrameFunctionalGroupsSequence.
          if (
              derivated.dataset.SharedFunctionalGroupsSequence[0]
                .PlaneOrientationSequence === undefined
          ) { // Might be an error ?
            perFrameFunctionalGroups.PlaneOrientationSequence = dcmjs.derivations.DerivedDataset.copyDataset(
                  derivated.referencedDataset.PerFrameFunctionalGroupsSequence[
                        frameNumber-1
                    ].PlaneOrientationSequence
                );
          }
        } else { // If not referencedDataset.PerFrameFunctionalGroupSequence

          console.log(frameNumber)
          perFrameFunctionalGroups.PlanePositionSequence = {
            ImagePositionPatient:   dcmjs.derivations.DerivedDataset.copyDataset(
                  derivated.referencedDatasets[frameNumber-1].ImagePositionPatient
            )
          }

          if (
              derivated.dataset.SharedFunctionalGroupsSequence === undefined
          ) {

              perFrameFunctionalGroups.PlaneOrientationSequence = {
                ImageOrientationPatient: dcmjs.derivations.DerivedDataset.copyDataset(
                  derivated.referencedDatasets[frameNumber-1].ImageOrientationPatient
              )}
              derivated.dataset.SharedFunctionalGroupsSequence = {
                PlaneOrientationSequence: {
                  ImageOrientationPatient: dcmjs.derivations.DerivedDataset.copyDataset(
                    derivated.referencedDatasets[frameNumber-1].ImageOrientationPatient
                )},
                PixelMeasuresSequence: {
                  SliceThickness: dcmjs.derivations.DerivedDataset.copyDataset(
                    derivated.referencedDataset.SliceThickness
                  ),
                  SpacingBetweenSlices: dcmjs.derivations.DerivedDataset.copyDataset(
                    derivated.referencedDataset.SliceThickness
                  ),
                  PixelSpacing: dcmjs.derivations.DerivedDataset.copyDataset(
                    derivated.referencedDataset.PixelSpacing
                  )
                }
              }
          }
        }

        perFrameFunctionalGroups.FrameContentSequence = {
            DimensionIndexValues: [ReferencedSegmentNumber, frameNumber]
        };

        perFrameFunctionalGroups.SegmentIdentificationSequence = {
            ReferencedSegmentNumber
        };

        let ReferencedSOPClassUID;
        let ReferencedSOPInstanceUID;
        let ReferencedFrameNumber;

        if (ReferencedSeriesSequence) {
            const referencedInstanceSequenceI =
                ReferencedSeriesSequence.ReferencedInstanceSequence[
                    frameNumber-1
                ];
            ReferencedSOPClassUID =
                referencedInstanceSequenceI.ReferencedSOPClassUID;
            ReferencedSOPInstanceUID =
                referencedInstanceSequenceI.ReferencedSOPInstanceUID;

            if (dcmjs.normalizers.Normalizer.isMultiframeSOPClassUID(ReferencedSOPClassUID)) {
                ReferencedFrameNumber = frameNumber;
              }
        } else {
            ReferencedSOPClassUID = derivated.referencedDataset.SOPClassUID;
            ReferencedSOPInstanceUID = derivated.referencedDataset
                  .SOPInstanceUID;
            ReferencedFrameNumber = frameNumber;
        }

        if (ReferencedFrameNumber) {
            perFrameFunctionalGroups.DerivationImageSequence = {
                SourceImageSequence: {
                    ReferencedSOPClassUID,
                    ReferencedSOPInstanceUID,
                    ReferencedFrameNumber,
                    PurposeOfReferenceCodeSequence: {
                        CodeValue: "121322",
                        CodingSchemeDesignator: "DCM",
                        CodeMeaning:
                            "Source image for image processing operation"
                    }
                },
                DerivationCodeSequence: {
                    CodeValue: "113076",
                    CodingSchemeDesignator: "DCM",
                    CodeMeaning: "Segmentation"
                }
            };
        } else {
            perFrameFunctionalGroups.DerivationImageSequence = {
                SourceImageSequence: {
                    ReferencedSOPClassUID,
                    ReferencedSOPInstanceUID,
                    PurposeOfReferenceCodeSequence: {
                        CodeValue: "121322",
                        CodingSchemeDesignator: "DCM",
                        CodeMeaning:
                            "Source image for image processing operation"
                    }
                },
                DerivationCodeSequence: {
                    CodeValue: "113076",
                    CodingSchemeDesignator: "DCM",
                    CodeMeaning: "Segmentation"
                }
            };
        }

        PerFrameFunctionalGroupsSequence.push(perFrameFunctionalGroups);
    }
}

export function _addSegmentMetadata(derivated, Segment) {
    if (
        !Segment.SegmentLabel ||
        !Segment.SegmentedPropertyCategoryCodeSequence ||
        !Segment.SegmentedPropertyTypeCodeSequence ||
        !Segment.SegmentAlgorithmType
    ) {
        throw new Error(
            `Segment does not contain all the required fields.`
        );
    }

    // Capitalise the SegmentAlgorithmType if it happens to be given in
    // Lower/mixed case.
    Segment.SegmentAlgorithmType = Segment.SegmentAlgorithmType.toUpperCase();

    // Check SegmentAlgorithmType and SegmentAlgorithmName if necessary.
    switch (Segment.SegmentAlgorithmType) {
        case "AUTOMATIC":
        case "SEMIAUTOMATIC":
            if (!Segment.SegmentAlgorithmName) {
                throw new Error(
                    `If the SegmentAlgorithmType is SEMIAUTOMATIC or AUTOMATIC,
          SegmentAlgorithmName must be provided`
                );
            }

            break;
        case "MANUAL":
            break;
        default:
            throw new Error(
                `SegmentAlgorithmType ${Segment.SegmentAlgorithmType} invalid.`
            );
    }

    // Deep copy, so we don't change the segment index stored in cornerstoneTools.

    const SegmentSequence = derivated.dataset.SegmentSequence;

    const SegmentAlgorithmType = Segment.SegmentAlgorithmType;

    const reNumberedSegmentCopy = {
          SegmentedPropertyCategoryCodeSequence:
              Segment.SegmentedPropertyCategoryCodeSequence,
          SegmentNumber: (SegmentSequence.length + 1).toString(),
          SegmentLabel: Segment.SegmentLabel,
          SegmentAlgorithmType,
          RecommendedDisplayCIELabValue:
                Segment.RecommendedDisplayCIELabValue,
          SegmentedPropertyTypeCodeSequence:
                Segment.SegmentedPropertyTypeCodeSequence
    };

    if (
        SegmentAlgorithmType === "AUTOMATIC" ||
        SegmentAlgorithmType === "SEMIAUTOMATIC"
    ) {
        reNumberedSegmentCopy.SegmentAlgorithmName =
            Segment.SegmentAlgorithmName;
    }

    SegmentSequence.push(reNumberedSegmentCopy);
    derivated.dataset.SegmentSequence = SegmentSequence;
    return  reNumberedSegmentCopy.SegmentNumber;
}

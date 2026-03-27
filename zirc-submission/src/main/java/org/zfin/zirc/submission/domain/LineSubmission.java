package org.zfin.zirc.submission.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "line_submission")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LineSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    private String abbreviation;

    @Column(columnDefinition = "text")
    private String previousNames;

    // -- Reasons to accept (checkbox group → lookup table) --

    @ManyToMany
    @JoinTable(name = "line_submission_reason",
            joinColumns = @JoinColumn(name = "line_submission_id"),
            inverseJoinColumns = @JoinColumn(name = "reason"))
    @Builder.Default
    private Set<ReasonOption> reasons = new LinkedHashSet<>();

    // -- Mutations --

    @OneToMany(mappedBy = "lineSubmission", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder")
    @Builder.Default
    private List<Mutation> mutations = new ArrayList<>();

    // -- Linked Features --

    private Boolean featuresLinked;

    @ElementCollection
    @CollectionTable(name = "line_submission_linked_feature",
            joinColumns = @JoinColumn(name = "line_submission_id"))
    @Column(name = "feature")
    @Builder.Default
    private Set<String> linkedFeatures = new LinkedHashSet<>();

    private Boolean distanceKnown;
    private Double distanceCentimorgans;
    private Double distanceMegabases;

    @Column(columnDefinition = "text")
    private String linkedFeaturesAdditionalInfo;

    // -- Line Background --

    private String maternalBackground;
    private String paternalBackground;
    private Boolean backgroundChangeable;

    @Column(columnDefinition = "text")
    private String backgroundChangeConcerns;

    private Boolean unreportedFeatures;

    @Column(columnDefinition = "text")
    private String unreportedFeaturesDetails;

    @Column(columnDefinition = "text")
    private String additionalInfo;

    // -- Timestamps --

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

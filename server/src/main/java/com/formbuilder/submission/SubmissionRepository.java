package com.formbuilder.submission;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, UUID> {

    Page<Submission> findByFormIdOrderBySubmittedAtDesc(UUID formId, Pageable pageable);

    List<Submission> findByFormIdOrderBySubmittedAtDesc(UUID formId);

    Optional<Submission> findByIdAndFormId(UUID id, UUID formId);

    Page<Submission> findByFormIdAndUserIdOrderBySubmittedAtDesc(UUID formId, UUID userId, Pageable pageable);

    int countByFormId(UUID formId);

    Optional<Submission> findFirstByFormIdAndUserIdAndStatus(UUID formId, UUID userId, SubmissionStatus status);
}

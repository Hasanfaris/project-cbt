# Perancangan Database CBT

## 1. Daftar Tabel

| Tabel | Fungsi |
|-------|--------|
| roles | Menyimpan role user |
| users | Menyimpan data pengguna |
| subjects | Menyimpan mata pelajaran |
| exams | Menyimpan data ujian |
| questions | Menyimpan soal |
| options | Menyimpan pilihan jawaban |
| exam_attempts | Menyimpan sesi pengerjaan ujian |
| student_answers | Menyimpan jawaban siswa |

## 2. Relasi Antar Tabel

- Satu role memiliki banyak user.
- Satu subject memiliki banyak exam.
- Satu user dapat membuat banyak exam.
- Satu exam memiliki banyak question.
- Satu question memiliki banyak option.
- Satu user dapat memiliki banyak exam_attempt.
- Satu exam memiliki banyak exam_attempt.
- Satu exam_attempt memiliki banyak student_answer.

## 3. ERD Sederhana

```
roles 1 --- * users
subjects 1 --- * exams
users 1 --- * exams
exams 1 --- * questions
questions 1 --- * options
users 1 --- * exam_attempts
exams 1 --- * exam_attempts
exam_attempts 1 --- * student_answers
questions 1 --- * student_answers
options 1 --- * student_answers
```

Logikanya begini:

- Kebutuhan sistem → menentukan fitur
- Fitur → menentukan data yang perlu disimpan
- Data → menjadi tabel database

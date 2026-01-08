from django.contrib import admin
from .models import Form, Section, Question, Option

class OptionInline(admin.TabularInline):
    model = Option
    extra = 1

class QuestionInline(admin.StackedInline):
    model = Question
    extra = 1
    show_change_link = True

class SectionInline(admin.StackedInline):
    model = Section
    extra = 1
    show_change_link = True

@admin.register(Form)
class FormAdmin(admin.ModelAdmin):
    list_display = ('title', 'creator', 'is_public', 'created_at')
    list_filter = ('is_public', 'creator')
    search_fields = ('title', 'description')
    inlines = [SectionInline]

@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ('title', 'form', 'order')
    list_filter = ('form',)
    inlines = [QuestionInline]

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('text', 'question_type', 'section', 'is_required', 'order')
    list_filter = ('question_type', 'section__form', 'is_required')
    search_fields = ('text',)
    inlines = [OptionInline]

@admin.register(Option)
class OptionAdmin(admin.ModelAdmin):
    list_display = ('text', 'question', 'order')
    list_filter = ('question__section__form',)

from django import template
from django import forms

register = template.Library()

@register.filter()
def widget_class(value, arg=None):
    widget = value.field.widget
    classes = set(widget.attrs.get('class', '').split(' '))

    if isinstance(widget, forms.Select): classes.add('form-select')
    elif isinstance(widget, forms.CheckboxInput): classes.add('form-check-input')
    elif isinstance(widget, forms.widgets.Textarea): classes.add('form-control')
    elif isinstance(widget, forms.widgets.Input):
        if widget.input_type == 'range': classes.add('form-range')
        else:
            classes.add('form-control')
            if widget.input_type == 'color':
                classes.add('form-control-color')

    if value.errors:
        classes.add('is-invalid')

    if arg is not None:
        for c in arg.split(' '):
            classes.add(c)

    return value.as_widget(attrs={'class': " ".join(classes)})

from django import template

register = template.Library()

@register.filter(name='class')
def addclass(value, arg):
    classes = set(value.field.widget.attrs.get('class', '').split(' '))
    for c in arg.split(' '):
        classes.add(c)
    return value.as_widget(attrs={'class': " ".join(classes)})

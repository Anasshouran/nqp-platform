def success_response(data=None, message=None):
    body = {'status': 'success'}
    if message is not None:
        body['message'] = message
    if data is not None:
        body['data'] = data
    return body


def error_response(message, data=None):
    body = {'status': 'error', 'message': message}
    if data is not None:
        body['data'] = data
    return body
